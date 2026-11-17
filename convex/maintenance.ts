import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { storageReferences } from "./lib/storage";
import { DAY } from "./lib/util";

const HOUR = 60 * 60 * 1000;

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
      .take(500);
    for (const s of sessions) await ctx.db.delete("sessions", s._id);

    const limits = await ctx.db
      .query("rateLimits")
      .withIndex("by_window", (q) => q.lt("windowStart", now - 2 * DAY))
      .take(1000);
    for (const l of limits) await ctx.db.delete("rateLimits", l._id);

    for (const invite of await ctx.db.query("invites").collect()) {
      if (!invite.acceptedAt && invite.expiresAt < now - 30 * DAY) await ctx.db.delete("invites", invite._id);
    }
    for (const reset of await ctx.db.query("passwordResets").collect()) {
      if (reset.usedAt || reset.expiresAt < now) await ctx.db.delete("passwordResets", reset._id);
    }
    return { sessions: sessions.length, limits: limits.length };
  },
});

/**
 * Deletes uploads nobody claimed: CVs from applications that were never
 * sent, or dashboard uploads that were never saved. Applicants get two hours
 * to finish the form. Only files from the given window are checked, so the
 * hourly run reads a handful of records instead of the whole storage.
 */
export const orphans = internalMutation({
  args: { fromHoursAgo: v.number(), toHoursAgo: v.number() },
  handler: async (ctx, { fromHoursAgo, toHoursAgo }) => {
    const now = Date.now();
    const files = await ctx.db.system
      .query("_storage")
      .withIndex("by_creation_time", (q) =>
        q.gt("_creationTime", now - fromHoursAgo * HOUR).lt("_creationTime", now - Math.max(2, toHoursAgo) * HOUR),
      )
      .take(500);
    let refs: Map<string, unknown> | null = null;
    let removed = 0;
    for (const file of files) {
      const inMedia = await ctx.db
        .query("media")
        .withIndex("by_storage", (q) => q.eq("storageId", file._id))
        .first();
      if (inMedia) continue;
      const inApplication = await ctx.db
        .query("applications")
        .withIndex("by_cv", (q) => q.eq("cv", file._id))
        .first();
      if (inApplication) continue;
      refs ??= await storageReferences(ctx);
      if (refs.has(file._id)) continue;
      await ctx.storage.delete(file._id);
      removed++;
    }
    return { checked: files.length, removed };
  },
});
