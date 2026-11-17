import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { FREE_PLAN } from "./lib/storage";

/**
 * How much of the free plan's 1 GB of file storage is in use, by kind.
 * Library files are counted by what they are; everything else is applicants'
 * CVs (plus uploads that are about to be cleaned up).
 */
export const usage = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token, "media");
    const files = await ctx.db.system.query("_storage").collect();
    const media = await ctx.db.query("media").collect();
    const byStorage = new Map(media.map((m) => [m.storageId as string, m]));

    const images = { count: 0, bytes: 0 };
    const videos = { count: 0, bytes: 0 };
    const other = { count: 0, bytes: 0 };
    for (const f of files) {
      const m = byStorage.get(f._id);
      const bucket = m?.kind === "image" ? images : m?.kind === "video" ? videos : other;
      bucket.count++;
      bucket.bytes += f.size;
    }

    const largest = media
      .filter((m) => files.some((f) => f._id === m.storageId))
      .sort((x, y) => y.size - x.size)
      .slice(0, 5)
      .map((m) => ({ _id: m._id, name: m.name, kind: m.kind, size: m.size }));

    return {
      totalBytes: images.bytes + videos.bytes + other.bytes,
      fileCount: files.length,
      limitBytes: FREE_PLAN.fileStorageBytes,
      images,
      videos,
      other,
      largest,
    };
  },
});
