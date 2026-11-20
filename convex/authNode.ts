"use node";
/**
 * Password handling runs in the Node runtime so we can use scrypt and a
 * cryptographically secure random source for tokens. Tokens are returned
 * once; only their SHA-256 hash is stored.
 *
 * People sign in with a username and a password. Passwords may be short and
 * easy on purpose; what keeps them safe is the sign-in limit (a few tries per
 * 15 minutes and per day for each username) and refusing the handful of
 * passwords that attackers try first.
 */
import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { ConvexError, v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action } from "./_generated/server";
import { can, normalizeUsername, usernameProblem } from "./lib/auth";
import { vRole } from "./lib/validators";

const PARAMS: ScryptOptions = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 64;

function derive(password: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEY_LEN, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await derive(password, Buffer.from(salt, "base64"), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: PARAMS.maxmem,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

let dummyHash: string | null = null;
async function burnTime(password: string) {
  dummyHash ??= await hashPassword("not-a-real-password");
  await verifyPassword(password, dummyHash);
}

function newToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: createHash("sha256").update(token).digest("hex") };
}

const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");

const MIN_PASSWORD = 4;
/** The first passwords anyone guessing would try, including this site's own name. */
const FIRST_GUESSES = new Set([
  "1234", "12345", "123456", "1234567", "12345678", "123456789", "1234567890", "4321", "54321", "654321",
  "0000", "00000", "000000", "1111", "11111", "111111", "123123", "112233", "121212",
  "password", "passw0rd", "password1", "qwerty", "qwerty123", "asdf", "abcd", "abc123", "iloveyou",
  "admin", "admin123", "letmein", "welcome", "test", "test123", "user", "login",
  "scale", "scaleadv", "scale123", "scale2025", "scale2026", "scalestudio",
]);

function checkPassword(password: string, username?: string) {
  if (password.length < MIN_PASSWORD) {
    throw new ConvexError({ code: "WEAK_PASSWORD", message: `Use at least ${MIN_PASSWORD} characters.`, field: "password" });
  }
  if (password.length > 200) {
    throw new ConvexError({ code: "WEAK_PASSWORD", message: "That password is too long.", field: "password" });
  }
  const lower = password.toLowerCase();
  if (FIRST_GUESSES.has(lower) || (username && lower === normalizeUsername(username))) {
    throw new ConvexError({
      code: "WEAK_PASSWORD",
      message: "That's one of the first passwords people guess. Add a few letters or numbers that mean something to you.",
      field: "password",
    });
  }
}

function checkUsername(raw: string) {
  const username = normalizeUsername(raw);
  const problem = usernameProblem(username);
  if (problem) throw new ConvexError({ code: "INVALID", message: problem, field: "username" });
  return username;
}

export const signIn = action({
  args: { username: v.string(), password: v.string(), userAgent: v.optional(v.string()) },
  handler: async (ctx, a): Promise<{ token: string }> => {
    const username = normalizeUsername(a.username);
    const recent = await ctx.runMutation(internal.authInternal.hit, { key: `login:${username}`, limit: 6, windowMs: 15 * 60 * 1000 });
    if (!recent) {
      throw new ConvexError({ code: "RATE_LIMITED", message: "Too many attempts. Try again in 15 minutes." });
    }
    const today = await ctx.runMutation(internal.authInternal.hit, { key: `login-day:${username}`, limit: 30, windowMs: 24 * 60 * 60 * 1000 });
    if (!today) {
      throw new ConvexError({ code: "RATE_LIMITED", message: "Too many sign-in attempts today. Try again tomorrow, or ask an owner for a reset link." });
    }
    const user = await ctx.runQuery(internal.authInternal.getUserByUsername, { username });
    if (!user || !user.active) {
      await burnTime(a.password);
      throw new ConvexError({ code: "BAD_CREDENTIALS", message: "That username and password don't match." });
    }
    if (!(await verifyPassword(a.password, user.passwordHash))) {
      throw new ConvexError({ code: "BAD_CREDENTIALS", message: "That username and password don't match." });
    }
    const { token, tokenHash } = newToken();
    await ctx.runMutation(internal.authInternal.createSession, { userId: user._id, tokenHash, userAgent: a.userAgent });
    return { token };
  },
});

export const setupOwner = action({
  args: {
    username: v.string(),
    password: v.string(),
    loadStarterContent: v.boolean(),
    setupKey: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, a): Promise<{ token: string }> => {
    // Optional protection for fresh production deployments: `npx convex env set SETUP_KEY <secret>`.
    const required = process.env.SETUP_KEY;
    if (required) {
      const given = Buffer.from(a.setupKey ?? "");
      const expected = Buffer.from(required);
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
        throw new ConvexError({ code: "INVALID", message: "That setup key isn't right.", field: "setupKey" });
      }
    }
    const username = checkUsername(a.username);
    checkPassword(a.password, username);
    const { token, tokenHash } = newToken();
    await ctx.runMutation(internal.authInternal.createOwner, {
      username,
      name: a.username.trim(),
      passwordHash: await hashPassword(a.password),
      tokenHash,
      userAgent: a.userAgent,
    });
    if (a.loadStarterContent) await ctx.runMutation(internal.seed.run, {});
    return { token };
  },
});

export const acceptInvite = action({
  args: { inviteToken: v.string(), password: v.string(), userAgent: v.optional(v.string()) },
  handler: async (ctx, a): Promise<{ token: string }> => {
    const info = await ctx.runQuery(api.users.inviteInfo, { inviteToken: a.inviteToken });
    if (!info.valid) throw new ConvexError({ code: "INVALID_LINK", message: "This invite link has expired or was already used." });
    checkPassword(a.password, info.username);
    const { token, tokenHash } = newToken();
    await ctx.runMutation(internal.authInternal.consumeInvite, {
      inviteTokenHash: hashOf(a.inviteToken),
      passwordHash: await hashPassword(a.password),
      sessionTokenHash: tokenHash,
      userAgent: a.userAgent,
    });
    return { token };
  },
});

export const createInvite = action({
  args: { token: v.string(), username: v.string(), role: vRole },
  handler: async (ctx, a): Promise<{ inviteToken: string }> => {
    const actor = await ctx.runQuery(internal.authInternal.viewer, { token: a.token });
    if (!actor || !can(actor.role, "users")) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Your role can't invite people." });
    }
    const username = checkUsername(a.username);
    const { token, tokenHash } = newToken();
    await ctx.runMutation(internal.authInternal.insertInvite, { actorId: actor._id, username, name: a.username.trim(), role: a.role, tokenHash });
    return { inviteToken: token };
  },
});

export const createResetLink = action({
  args: { token: v.string(), userId: v.id("users") },
  handler: async (ctx, a): Promise<{ resetToken: string }> => {
    const actor = await ctx.runQuery(internal.authInternal.viewer, { token: a.token });
    if (!actor) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in again." });
    const { token, tokenHash } = newToken();
    await ctx.runMutation(internal.authInternal.insertReset, { actorId: actor._id, userId: a.userId, tokenHash });
    return { resetToken: token };
  },
});

export const completeReset = action({
  args: { resetToken: v.string(), password: v.string(), userAgent: v.optional(v.string()) },
  handler: async (ctx, a): Promise<{ token: string }> => {
    const info = await ctx.runQuery(api.users.resetInfo, { resetToken: a.resetToken });
    if (!info.valid) throw new ConvexError({ code: "INVALID_LINK", message: "This reset link has expired or was already used." });
    checkPassword(a.password, info.username);
    const { token, tokenHash } = newToken();
    await ctx.runMutation(internal.authInternal.consumeReset, {
      resetTokenHash: hashOf(a.resetToken),
      passwordHash: await hashPassword(a.password),
      sessionTokenHash: tokenHash,
      userAgent: a.userAgent,
    });
    return { token };
  },
});

export const changePassword = action({
  args: { token: v.string(), currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, a): Promise<null> => {
    const user = await ctx.runQuery(internal.authInternal.viewer, { token: a.token });
    if (!user) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in again." });
    if (!(await verifyPassword(a.currentPassword, user.passwordHash))) {
      throw new ConvexError({ code: "BAD_CREDENTIALS", message: "Your current password is wrong.", field: "currentPassword" });
    }
    checkPassword(a.newPassword, user.username);
    await ctx.runMutation(internal.authInternal.setPassword, {
      userId: user._id,
      passwordHash: await hashPassword(a.newPassword),
      keepTokenHash: hashOf(a.token),
    });
    return null;
  },
});
