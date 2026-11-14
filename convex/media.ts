import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { logActivity } from "./lib/activity";
import { requireUser } from "./lib/auth";
import { fail } from "./lib/util";

const vKind = v.union(v.literal("image"), v.literal("video"), v.literal("file"));

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token, "media");
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    storageId: v.id("_storage"),
    name: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    alt: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, "media");
    const meta = await ctx.db.system.get("_storage", a.storageId);
    if (!meta) fail("The upload didn't finish. Try again.");
    const contentType = meta.contentType ?? "application/octet-stream";
    const kind: "image" | "video" | "file" = contentType.startsWith("image/")
      ? "image"
      : contentType.startsWith("video/")
        ? "video"
        : "file";
    const id = await ctx.db.insert("media", {
      storageId: a.storageId,
      name: a.name.slice(0, 160),
      contentType,
      size: meta.size,
      kind,
      width: a.width,
      height: a.height,
      alt: a.alt?.slice(0, 200),
      uploadedBy: user._id,
    });
    await logActivity(ctx, user, "uploaded", "media", a.name, id);
    return { _id: id, storageId: a.storageId, url: await ctx.storage.getUrl(a.storageId), kind };
  },
});

export const list = query({
  args: { token: v.string(), kind: v.optional(vKind), paginationOpts: paginationOptsValidator },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, "media");
    const result = a.kind
      ? await ctx.db
          .query("media")
          .withIndex("by_kind", (q) => q.eq("kind", a.kind!))
          .order("desc")
          .paginate(a.paginationOpts)
      : await ctx.db.query("media").order("desc").paginate(a.paginationOpts);
    const users = new Map((await ctx.db.query("users").collect()).map((u) => [u._id, u.name]));
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (m) => ({
          ...m,
          url: await ctx.storage.getUrl(m.storageId),
          uploadedByName: users.get(m.uploadedBy) ?? "",
        })),
      ),
    };
  },
});

export const update = mutation({
  args: { token: v.string(), id: v.id("media"), name: v.string(), alt: v.optional(v.string()) },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, "media");
    await ctx.db.patch("media", a.id, { name: a.name.slice(0, 160), alt: a.alt?.slice(0, 200) });
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("media") },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, "media");
    const doc = await ctx.db.get("media", a.id);
    if (!doc) return;
    await ctx.storage.delete(doc.storageId);
    await ctx.db.delete("media", a.id);
    await logActivity(ctx, user, "deleted", "media", doc.name);
  },
});

/** Resolves stored file ids to URLs for previews in forms. */
export const urls = query({
  args: { token: v.string(), ids: v.array(v.id("_storage")) },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token);
    const out: Record<string, string | null> = {};
    for (const id of a.ids.slice(0, 100)) out[id] = await ctx.storage.getUrl(id as Id<"_storage">);
    return out;
  },
});
