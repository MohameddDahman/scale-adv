import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { logActivity } from "./lib/activity";
import { requireUser } from "./lib/auth";
import { clearReferences, formatBytes, IMAGE_TYPES, MAX_IMAGE_BYTES, storageReferences } from "./lib/storage";
import { fail } from "./lib/util";

const vKind = v.union(v.literal("image"), v.literal("video"), v.literal("file"));

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token, "media");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Registers an upload in the library. Only compressed images are kept:
 * anything else is deleted on the spot and the reason is returned (not
 * thrown, because throwing would undo the delete). An image that's already
 * in the library (same bytes) is reused instead of stored twice.
 */
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

    const registered = await ctx.db
      .query("media")
      .withIndex("by_storage", (q) => q.eq("storageId", a.storageId))
      .first();
    if (registered) return await accepted(ctx, registered, false);

    const contentType = meta.contentType ?? "";
    const problem = contentType.startsWith("video/")
      ? "Video files aren't stored in the dashboard. Upload the video to Cloudinary, YouTube or Instagram and paste its link."
      : !IMAGE_TYPES.includes(contentType)
        ? "Only images can be uploaded here (JPG, PNG, WebP or SVG)."
        : meta.size > MAX_IMAGE_BYTES
          ? `This image is still ${formatBytes(meta.size)} after compression (the limit is 1 MB). Try a smaller image.`
          : null;
    if (problem) {
      await ctx.storage.delete(a.storageId);
      return { ok: false as const, message: problem };
    }

    const twin = await ctx.db
      .query("media")
      .withIndex("by_hash", (q) => q.eq("sha256", meta.sha256))
      .first();
    if (twin && (await ctx.db.system.get("_storage", twin.storageId))) {
      await ctx.storage.delete(a.storageId);
      return await accepted(ctx, twin, true);
    }

    const id = await ctx.db.insert("media", {
      storageId: a.storageId,
      sha256: meta.sha256,
      name: a.name.slice(0, 160),
      contentType,
      size: meta.size,
      kind: "image",
      width: a.width,
      height: a.height,
      alt: a.alt?.slice(0, 200),
      uploadedBy: user._id,
    });
    await logActivity(ctx, user, "uploaded", "media", `${a.name} (${formatBytes(meta.size)})`, id);
    const doc = await ctx.db.get("media", id);
    return await accepted(ctx, doc!, false);
  },
});

async function accepted(ctx: MutationCtx, m: Doc<"media">, reused: boolean) {
  return {
    ok: true as const,
    _id: m._id,
    storageId: m.storageId,
    url: await ctx.storage.getUrl(m.storageId),
    kind: m.kind,
    size: m.size,
    reused,
  };
}

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
    const refs = await storageReferences(ctx);
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (m) => ({
          ...m,
          url: await ctx.storage.getUrl(m.storageId),
          uploadedByName: users.get(m.uploadedBy) ?? "",
          usedIn: refs.get(m.storageId) ?? [],
        })),
      ),
    };
  },
});

/** Library files nothing on the website uses: safe to delete to free up space. */
export const unused = query({
  args: { token: v.string() },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, "media");
    const refs = await storageReferences(ctx);
    const items = (await ctx.db.query("media").order("desc").collect()).filter((m) => !refs.has(m.storageId));
    return {
      count: items.length,
      bytes: items.reduce((sum, m) => sum + m.size, 0),
      items: await Promise.all(
        items.slice(0, 200).map(async (m) => ({
          _id: m._id,
          name: m.name,
          kind: m.kind,
          size: m.size,
          width: m.width,
          height: m.height,
          alt: m.alt,
          storageId: m.storageId,
          _creationTime: m._creationTime,
          url: await ctx.storage.getUrl(m.storageId),
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

/** Deletes a file. Anything that showed it (a logo, a cover) is cleared too. */
export const remove = mutation({
  args: { token: v.string(), id: v.id("media") },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, "media");
    const doc = await ctx.db.get("media", a.id);
    if (!doc) return;
    await clearReferences(ctx, doc.storageId);
    if (await ctx.db.system.get("_storage", doc.storageId)) await ctx.storage.delete(doc.storageId);
    await ctx.db.delete("media", a.id);
    await logActivity(ctx, user, "deleted", "media", `${doc.name} (${formatBytes(doc.size)})`);
  },
});

/** Deletes library files that aren't used anywhere. Files that became used in the meantime are kept. */
export const removeUnused = mutation({
  args: { token: v.string(), ids: v.array(v.id("media")) },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, "media");
    const refs = await storageReferences(ctx);
    let removed = 0;
    let bytes = 0;
    for (const id of a.ids.slice(0, 200)) {
      const doc = await ctx.db.get("media", id);
      if (!doc || refs.has(doc.storageId)) continue;
      if (await ctx.db.system.get("_storage", doc.storageId)) await ctx.storage.delete(doc.storageId);
      await ctx.db.delete("media", id);
      removed++;
      bytes += doc.size;
    }
    if (removed) await logActivity(ctx, user, "deleted unused", "media", `${removed} file${removed === 1 ? "" : "s"} (${formatBytes(bytes)})`);
    return { removed, bytes, kept: Math.min(a.ids.length, 200) - removed };
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
