"use node";
/**
 * Password handling runs in the Node runtime so we can use scrypt and a
 * cryptographically secure random source for tokens. Tokens are returned
 * once; only their SHA-256 hash is stored.
 */
import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { can, normalizeEmail } from "./lib/auth";
import { isEmail } from "./lib/util";
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

function checkPassword(password: string, email?: string) {
  if (password.length < 10) {
    throw new ConvexError({ code: "WEAK_PASSWORD", message: "Use at least 10 characters.", field: "password" });
  }
  if (password.length > 200) {
    throw new ConvexError({ code: "WEAK_PASSWORD", message: "That password is too long.", field: "password" });
  }
  const local = email?.split("@")[0].toLowerCase() ?? "";
  if (local.length >= 4 && password.toLowerCase().includes(local)) {
    throw new ConvexError({ code: "WEAK_PASSWORD", message: "Don't include your email in the password.", field: "password" });
  }
}

export const signIn = action({
  args: { email: v.string(), password: v.string(), userAgent: v.optional(v.string()) },
  handler: async (ctx, a): Promise<{ token: string }> => {
    const email = normalizeEmail(a.email);
    const allowed = await ctx.runMutation(internal.authInternal.hit, {
      key: `login:${email}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!allowed) {
      throw new ConvexError({ code: "RATE_LIMITED", message: "Too many attempts. Try again in 15 minutes." });
    }
    const user = await ctx.runQuery(internal.authInternal.getUserByEmail, { email });
    if (!user || !user.active) {
      await burnTime(a.password);
      throw new ConvexError({ code: "BAD_CREDENTIALS", message: "That email and password don't match." });
    }
    if (!(await verifyPassword(a.password, user.passwordHash))) {
      throw new ConvexError({ code: "BAD_CREDENTIALS", message: "That email and password don't match." });
    }
    const { token, tokenHash } = newToken();
    await ctx.runMutation(internal.authInternal.createSession, { userId: user._id, tokenHash, userAgent: a.userAgent });
    return { token };
  },
});

export const setupOwner = action({
  args: {
    name: v.string(),
    email: v.string(),
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
    const email = normalizeEmail(a.email);
    if (!a.name.trim()) throw new ConvexError({ code: "INVALID", message: "Add your name.", field: "name" });
    if (!isEmail(email)) throw new ConvexError({ code: "INVALID", message: "Enter a valid email.", field: "email" });
    checkPassword(a.password, email);
    const { token, tokenHash } = newToken();
    await ctx.runMutation(internal.authInternal.createOwner, {
      name: a.name,
      email,
      passwordHash: await hashPassword(a.password),
      tokenHash,
      userAgent: a.userAgent,
    });
    if (a.loadStarterContent) await ctx.runMutation(internal.seed.run, {});
    return { token };
  },
});

export const acceptInvite = action({
  args: { inviteToken: v.string(), name: v.string(), password: v.string(), userAgent: v.optional(v.string()) },
  handler: async (ctx, a): Promise<{ token: string }> => {
    if (!a.name.trim()) throw new ConvexError({ code: "INVALID", message: "Add your name.", field: "name" });
    checkPassword(a.password);
    const { token, tokenHash } = newToken();
    await ctx.runMutation(internal.authInternal.consumeInvite, {
      inviteTokenHash: hashOf(a.inviteToken),
      name: a.name,
      passwordHash: await hashPassword(a.password),
      sessionTokenHash: tokenHash,
      userAgent: a.userAgent,
    });
    return { token };
  },
});

export const createInvite = action({
  args: { token: v.string(), email: v.string(), role: vRole },
  handler: async (ctx, a): Promise<{ inviteToken: string }> => {
    const actor = await ctx.runQuery(internal.authInternal.viewer, { token: a.token });
    if (!actor || !can(actor.role, "users")) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Your role can't invite people." });
    }
    const email = normalizeEmail(a.email);
    if (!isEmail(email)) throw new ConvexError({ code: "INVALID", message: "Enter a valid email.", field: "email" });
    const { token, tokenHash } = newToken();
    await ctx.runMutation(internal.authInternal.insertInvite, { actorId: actor._id, email, role: a.role, tokenHash });
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
    checkPassword(a.password);
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
    checkPassword(a.newPassword, user.email);
    await ctx.runMutation(internal.authInternal.setPassword, {
      userId: user._id,
      passwordHash: await hashPassword(a.newPassword),
      keepTokenHash: hashOf(a.token),
    });
    return null;
  },
});
