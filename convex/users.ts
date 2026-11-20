import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logActivity } from "./lib/activity";
import { getSession, PERMISSIONS, publicUser, requireUser, type Permission } from "./lib/auth";
import { sha256Hex } from "./lib/sha256";
import { vRole } from "./lib/validators";

export const setupStatus = query({
  args: {},
  handler: async (ctx) => ({
    needsSetup: !(await ctx.db.query("users").first()),
  }),
});

export const me = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    const found = await getSession(ctx, token);
    if (!found) return null;
    const permissions = (Object.keys(PERMISSIONS) as Permission[]).filter((p) =>
      (PERMISSIONS[p] as readonly string[]).includes(found.user.role),
    );
    return { ...publicUser(found.user), permissions, sessionExpiresAt: found.session.expiresAt };
  },
});

export const signOut = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const found = await getSession(ctx, token);
    if (found) await ctx.db.delete("sessions", found.session._id);
  },
});

export const signOutOthers = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const found = await getSession(ctx, token);
    if (!found) return 0;
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", found.user._id))
      .collect();
    let removed = 0;
    for (const s of sessions) {
      if (s._id !== found.session._id) {
        await ctx.db.delete("sessions", s._id);
        removed++;
      }
    }
    return removed;
  },
});

export const updateProfile = mutation({
  args: { token: v.string(), name: v.string() },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token);
    const name = a.name.trim().slice(0, 80);
    if (!name) throw new ConvexError({ code: "INVALID", message: "Add your name.", field: "name" });
    await ctx.db.patch("users", user._id, { name });
  },
});

export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token, "users");
    const users = await ctx.db.query("users").collect();
    const invites = (await ctx.db.query("invites").collect()).filter((i) => !i.acceptedAt);
    return {
      users: users.map(publicUser),
      invites: invites.map((i) => ({
        _id: i._id,
        username: i.username,
        name: i.name,
        role: i.role,
        expiresAt: i.expiresAt,
        expired: i.expiresAt < Date.now(),
        createdAt: i._creationTime,
      })),
    };
  },
});

export const updateRole = mutation({
  args: { token: v.string(), userId: v.id("users"), role: vRole },
  handler: async (ctx, a) => {
    const actor = await requireUser(ctx, a.token, "users");
    const target = await ctx.db.get("users", a.userId);
    if (!target) return;
    if ((target.role === "owner" || a.role === "owner") && actor.role !== "owner") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only an owner can change owner access." });
    }
    if (target._id === actor._id && a.role !== "owner" && actor.role === "owner") {
      const owners = (await ctx.db.query("users").collect()).filter((u) => u.role === "owner" && u.active);
      if (owners.length <= 1) {
        throw new ConvexError({ code: "INVALID", message: "Add another owner before changing your own role." });
      }
    }
    await ctx.db.patch("users", a.userId, { role: a.role });
    await logActivity(ctx, actor, "changed role", "user", `${target.username} → ${a.role}`);
  },
});

export const setActive = mutation({
  args: { token: v.string(), userId: v.id("users"), active: v.boolean() },
  handler: async (ctx, a) => {
    const actor = await requireUser(ctx, a.token, "users");
    const target = await ctx.db.get("users", a.userId);
    if (!target) return;
    if (target._id === actor._id) {
      throw new ConvexError({ code: "INVALID", message: "You can't disable your own account." });
    }
    if (target.role === "owner" && actor.role !== "owner") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only an owner can disable an owner." });
    }
    await ctx.db.patch("users", a.userId, { active: a.active });
    if (!a.active) {
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", a.userId))
        .collect();
      for (const s of sessions) await ctx.db.delete("sessions", s._id);
    }
    await logActivity(ctx, actor, a.active ? "enabled" : "disabled", "user", target.username);
  },
});

export const revokeInvite = mutation({
  args: { token: v.string(), inviteId: v.id("invites") },
  handler: async (ctx, a) => {
    const actor = await requireUser(ctx, a.token, "users");
    const invite = await ctx.db.get("invites", a.inviteId);
    if (!invite) return;
    await ctx.db.delete("invites", a.inviteId);
    await logActivity(ctx, actor, "revoked invite", "user", invite.username);
  },
});

/** Lets the invite page greet the person and catch dead links before they type a password. */
export const inviteInfo = query({
  args: { inviteToken: v.string() },
  handler: async (ctx, { inviteToken }) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("tokenHash", sha256Hex(inviteToken)))
      .unique();
    if (!invite || invite.acceptedAt || invite.expiresAt < Date.now()) return { valid: false as const };
    return { valid: true as const, username: invite.username, role: invite.role };
  },
});

export const resetInfo = query({
  args: { resetToken: v.string() },
  handler: async (ctx, { resetToken }) => {
    const reset = await ctx.db
      .query("passwordResets")
      .withIndex("by_token", (q) => q.eq("tokenHash", sha256Hex(resetToken)))
      .unique();
    if (!reset || reset.usedAt || reset.expiresAt < Date.now()) return { valid: false as const };
    const user = await ctx.db.get("users", reset.userId);
    return user ? { valid: true as const, username: user.username } : { valid: false as const };
  },
});

/** Staff list for assignee pickers. */
export const staff = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token);
    const users = await ctx.db.query("users").collect();
    return users.filter((u) => u.active).map((u) => ({ _id: u._id, name: u.name, username: u.username, role: u.role }));
  },
});
