import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { logActivity } from "./lib/activity";
import { can, getSession, normalizeEmail, SESSION_TTL_MS } from "./lib/auth";
import { hitLimit } from "./lib/rateLimit";
import { vRole } from "./lib/validators";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 24 * 60 * 60 * 1000;

async function insertSession(ctx: MutationCtx, userId: Id<"users">, tokenHash: string, userAgent?: string) {
  await ctx.db.insert("sessions", {
    userId,
    tokenHash,
    expiresAt: Date.now() + SESSION_TTL_MS,
    userAgent: userAgent?.slice(0, 200),
  });
}

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) =>
    await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizeEmail(email)))
      .unique(),
});

export const viewer = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => (await getSession(ctx, token))?.user ?? null,
});

export const hit = internalMutation({
  args: { key: v.string(), limit: v.number(), windowMs: v.number() },
  handler: async (ctx, a) => await hitLimit(ctx, a.key, a.limit, a.windowMs),
});

export const createSession = internalMutation({
  args: { userId: v.id("users"), tokenHash: v.string(), userAgent: v.optional(v.string()) },
  handler: async (ctx, a) => {
    await insertSession(ctx, a.userId, a.tokenHash, a.userAgent);
    await ctx.db.patch("users", a.userId, { lastLoginAt: Date.now() });
  },
});

export const createOwner = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    tokenHash: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    if (await ctx.db.query("users").first()) {
      throw new ConvexError({ code: "SETUP_DONE", message: "This dashboard is already set up. Sign in instead." });
    }
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: normalizeEmail(a.email),
      name: a.name.trim(),
      role: "owner",
      active: true,
      passwordHash: a.passwordHash,
      lastLoginAt: now,
      lastSeenLeadsAt: 0,
      lastSeenApplicationsAt: 0,
    });
    await insertSession(ctx, userId, a.tokenHash, a.userAgent);
    const user = await ctx.db.get("users", userId);
    await logActivity(ctx, user, "set up", "dashboard", "Owner account created");
    return userId;
  },
});

export const insertInvite = internalMutation({
  args: { actorId: v.id("users"), email: v.string(), role: vRole, tokenHash: v.string() },
  handler: async (ctx, a) => {
    const actor = await ctx.db.get("users", a.actorId);
    if (!actor || !can(actor.role, "users")) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Your role can't invite people." });
    }
    if (a.role === "owner" && actor.role !== "owner") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only the owner can invite another owner." });
    }
    const email = normalizeEmail(a.email);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) throw new ConvexError({ code: "INVALID", message: "Someone with this email already has access." });
    const pending = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    for (const p of pending) if (!p.acceptedAt) await ctx.db.delete("invites", p._id);
    await ctx.db.insert("invites", {
      email,
      role: a.role,
      tokenHash: a.tokenHash,
      invitedBy: a.actorId,
      expiresAt: Date.now() + INVITE_TTL_MS,
    });
    await logActivity(ctx, actor, "invited", "user", `${email} as ${a.role}`);
  },
});

export const consumeInvite = internalMutation({
  args: {
    inviteTokenHash: v.string(),
    name: v.string(),
    passwordHash: v.string(),
    sessionTokenHash: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("tokenHash", a.inviteTokenHash))
      .unique();
    if (!invite || invite.acceptedAt || invite.expiresAt < Date.now()) {
      throw new ConvexError({ code: "INVALID_LINK", message: "This invite link has expired or was already used." });
    }
    const taken = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", invite.email))
      .unique();
    if (taken) throw new ConvexError({ code: "INVALID_LINK", message: "This email already has an account. Sign in instead." });
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: invite.email,
      name: a.name.trim(),
      role: invite.role,
      active: true,
      passwordHash: a.passwordHash,
      lastLoginAt: now,
      lastSeenLeadsAt: 0,
      lastSeenApplicationsAt: 0,
    });
    await ctx.db.patch("invites", invite._id, { acceptedAt: now });
    await insertSession(ctx, userId, a.sessionTokenHash, a.userAgent);
    const user = await ctx.db.get("users", userId);
    await logActivity(ctx, user, "joined", "user", `${invite.email} (${invite.role})`);
  },
});

export const insertReset = internalMutation({
  args: { actorId: v.id("users"), userId: v.id("users"), tokenHash: v.string() },
  handler: async (ctx, a) => {
    const actor = await ctx.db.get("users", a.actorId);
    const target = await ctx.db.get("users", a.userId);
    if (!actor || !target || !can(actor.role, "users")) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Your role can't reset passwords." });
    }
    if (target.role === "owner" && actor.role !== "owner") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only an owner can reset an owner's password." });
    }
    await ctx.db.insert("passwordResets", {
      userId: a.userId,
      tokenHash: a.tokenHash,
      expiresAt: Date.now() + RESET_TTL_MS,
    });
    await logActivity(ctx, actor, "created reset link", "user", target.email);
  },
});

export const consumeReset = internalMutation({
  args: {
    resetTokenHash: v.string(),
    passwordHash: v.string(),
    sessionTokenHash: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const reset = await ctx.db
      .query("passwordResets")
      .withIndex("by_token", (q) => q.eq("tokenHash", a.resetTokenHash))
      .unique();
    if (!reset || reset.usedAt || reset.expiresAt < Date.now()) {
      throw new ConvexError({ code: "INVALID_LINK", message: "This reset link has expired or was already used." });
    }
    const user = await ctx.db.get("users", reset.userId);
    if (!user || !user.active) throw new ConvexError({ code: "INVALID_LINK", message: "This account is disabled." });
    await ctx.db.patch("users", user._id, { passwordHash: a.passwordHash, lastLoginAt: Date.now() });
    await ctx.db.patch("passwordResets", reset._id, { usedAt: Date.now() });
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const s of sessions) await ctx.db.delete("sessions", s._id);
    await insertSession(ctx, user._id, a.sessionTokenHash, a.userAgent);
    await logActivity(ctx, user, "reset password", "user", user.email);
  },
});

export const setPassword = internalMutation({
  args: { userId: v.id("users"), passwordHash: v.string(), keepTokenHash: v.string() },
  handler: async (ctx, a) => {
    await ctx.db.patch("users", a.userId, { passwordHash: a.passwordHash });
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", a.userId))
      .collect();
    for (const s of sessions) if (s.tokenHash !== a.keepTokenHash) await ctx.db.delete("sessions", s._id);
    const user = await ctx.db.get("users", a.userId);
    await logActivity(ctx, user, "changed password", "user", user?.email ?? "");
  },
});
