import { internalMutation } from "./_generated/server";
import { DAY } from "./lib/util";

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
 * Deletes uploaded files nobody references after a day: abandoned CV
 * uploads from the careers form, or files whose upload never got saved.
 */
export const orphans = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - DAY;
    const settings = await ctx.db.query("settings").first();
    const files = await ctx.db.system.query("_storage").take(1000);
    let removed = 0;
    for (const file of files) {
      if (file._creationTime > cutoff) continue;
      if (settings?.seo.ogImage === file._id) continue;
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
      await ctx.storage.delete(file._id);
      removed++;
    }
    return { removed };
  },
});
