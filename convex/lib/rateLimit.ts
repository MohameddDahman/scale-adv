import type { MutationCtx } from "../_generated/server";

/**
 * Fixed-window limiter backed by a table. Returns false when the caller is
 * over the limit for the current window.
 */
export async function hitLimit(ctx: MutationCtx, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (!row) {
    await ctx.db.insert("rateLimits", { key, count: 1, windowStart: now });
    return true;
  }
  if (now - row.windowStart > windowMs) {
    await ctx.db.patch(row._id, { count: 1, windowStart: now });
    return true;
  }
  if (row.count >= limit) return false;
  await ctx.db.patch(row._id, { count: row.count + 1 });
  return true;
}
