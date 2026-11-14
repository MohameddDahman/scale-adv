import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";

export const list = query({
  args: { token: v.string(), entity: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, "activity");
    if (a.entity) {
      const entity = a.entity;
      return await ctx.db
        .query("activity")
        .withIndex("by_entity", (q) => q.eq("entity", entity))
        .order("desc")
        .paginate(a.paginationOpts);
    }
    return await ctx.db.query("activity").order("desc").paginate(a.paginationOpts);
  },
});
