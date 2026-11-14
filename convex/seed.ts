import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, type MutationCtx } from "./_generated/server";
import { logActivity } from "./lib/activity";
import { requireUser } from "./lib/auth";
import {
  DEFAULT_CASE_STUDIES,
  DEFAULT_CLIENTS,
  DEFAULT_FAQS,
  DEFAULT_JOBS,
  DEFAULT_REELS,
  DEFAULT_SERVICES,
  DEFAULT_SETTINGS,
} from "./lib/defaults";

/** Fills empty collections with the starter content. Never overwrites existing items. */
async function seedAll(ctx: MutationCtx) {
  const added: Record<string, number> = {};

  if (!(await ctx.db.query("settings").first())) {
    await ctx.db.insert("settings", { key: "site", ...DEFAULT_SETTINGS });
    added.settings = 1;
  }

  if (!(await ctx.db.query("services").first())) {
    for (const [order, s] of DEFAULT_SERVICES.entries()) await ctx.db.insert("services", { ...s, order });
    added.services = DEFAULT_SERVICES.length;
  }

  const clientIds = new Map<string, Id<"clients">>();
  if (!(await ctx.db.query("clients").first())) {
    for (const [order, c] of DEFAULT_CLIENTS.entries()) {
      clientIds.set(c.slug, await ctx.db.insert("clients", { ...c, order }));
    }
    added.clients = DEFAULT_CLIENTS.length;
  } else {
    for (const c of await ctx.db.query("clients").collect()) clientIds.set(c.slug, c._id);
  }

  if (!(await ctx.db.query("reels").first())) {
    for (const [order, r] of DEFAULT_REELS.entries()) {
      const { clientSlug, ...rest } = r;
      await ctx.db.insert("reels", { ...rest, clientId: clientSlug ? clientIds.get(clientSlug) : undefined, order });
    }
    added.reels = DEFAULT_REELS.length;
  }

  if (!(await ctx.db.query("jobs").first())) {
    const now = Date.now();
    for (const [order, j] of DEFAULT_JOBS.entries()) {
      await ctx.db.insert("jobs", { ...j, order, publishedAt: j.status === "open" ? now : undefined });
    }
    added.jobs = DEFAULT_JOBS.length;
  }

  if (!(await ctx.db.query("faqs").first())) {
    for (const [order, f] of DEFAULT_FAQS.entries()) await ctx.db.insert("faqs", { ...f, order });
    added.faqs = DEFAULT_FAQS.length;
  }

  if (!(await ctx.db.query("caseStudies").first())) {
    for (const [order, c] of DEFAULT_CASE_STUDIES.entries()) {
      const { clientSlug, ...rest } = c;
      await ctx.db.insert("caseStudies", { ...rest, clientId: clientSlug ? clientIds.get(clientSlug) : undefined, order });
    }
    added.caseStudies = DEFAULT_CASE_STUDIES.length;
  }

  return added;
}

/** `npx convex run seed:run` */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => await seedAll(ctx),
});

/** "Load starter content" button on the dashboard. */
export const loadStarter = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token, "settings");
    const added = await seedAll(ctx);
    await logActivity(ctx, user, "loaded", "starter content", Object.keys(added).join(", ") || "nothing new");
    return added;
  },
});
