import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logActivity } from "./lib/activity";
import { requireUser } from "./lib/auth";
import { DEFAULT_SETTINGS } from "./lib/defaults";
import { loadSettings } from "./site";
import {
  vAnnouncement,
  vCareers,
  vContact,
  vGeneral,
  vHero,
  vSeo,
  vSocial,
  vStat,
} from "./lib/validators";

export const get = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token, "settings");
    const settings = await loadSettings(ctx);
    const ogImageUrl = settings.seo.ogImage ? await ctx.storage.getUrl(settings.seo.ogImage) : null;
    return { ...settings, ogImageUrl };
  },
});

export const save = mutation({
  args: {
    token: v.string(),
    patch: v.object({
      general: v.optional(vGeneral),
      hero: v.optional(vHero),
      stats: v.optional(v.array(vStat)),
      contact: v.optional(vContact),
      social: v.optional(vSocial),
      careers: v.optional(vCareers),
      seo: v.optional(vSeo),
      announcement: v.optional(vAnnouncement),
    }),
  },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, "settings");
    const patch = Object.fromEntries(Object.entries(a.patch).filter(([, value]) => value !== undefined));
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique();
    if (existing) await ctx.db.patch("settings", existing._id, patch);
    else await ctx.db.insert("settings", { key: "site", ...DEFAULT_SETTINGS, ...patch });
    await logActivity(ctx, user, "updated", "settings", Object.keys(patch).join(", "));
  },
});
