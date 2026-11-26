import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logActivity } from "./lib/activity";
import { requireUser } from "./lib/auth";
import { DEFAULT_SETTINGS } from "./lib/defaults";
import { vFormatCard } from "./lib/validators";
import { loadSettings } from "./site";

/**
 * The "Formats that sell" cards (homepage and Services page). Kept with the
 * site settings, but edited by anyone who edits website content.
 */
export const get = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token, "content");
    return (await loadSettings(ctx)).formats;
  },
});

export const save = mutation({
  args: { token: v.string(), cards: v.array(vFormatCard) },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, "content");
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique();
    if (existing) await ctx.db.patch("settings", existing._id, { formats: a.cards });
    else await ctx.db.insert("settings", { key: "site", ...DEFAULT_SETTINGS, formats: a.cards });
    await logActivity(ctx, user, "updated", "format cards", `${a.cards.length} card${a.cards.length === 1 ? "" : "s"}`);
  },
});
