import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalQuery, type MutationCtx } from "./_generated/server";
import { makeCrud } from "./lib/crud";
import { fail, normalizeUrl } from "./lib/util";
import { REEL_FORMATS, reelFields } from "./lib/validators";

/** Deletes a reel's old Cloudinary video once nothing uses it (checked again inside the action). */
async function releaseVideo(ctx: MutationCtx, publicId: string | undefined) {
  if (publicId) await ctx.scheduler.runAfter(0, internal.cloudinary.destroyIfUnused, { publicId });
}

export const { list, get, create, update, remove, reorder, setPublished, duplicate } = makeCrud({
  table: "reels",
  fields: reelFields,
  permission: "content",
  entity: "reel",
  label: (d) => d.title.en || d.title.ar,
  validate: async (_ctx, d) => {
    if (!d.title.en.trim() && !d.title.ar.trim()) fail("Give the reel a title.", "title");
    if (!(REEL_FORMATS as readonly string[]).includes(d.format)) fail("Pick a format.", "format");
    const videoUrl = normalizeUrl(d.videoUrl);
    const socialUrl = normalizeUrl(d.socialUrl);
    if (d.videoUrl?.trim() && !videoUrl) fail("Enter a valid video link.", "videoUrl");
    if (d.socialUrl?.trim() && !socialUrl) fail("Enter a valid post link.", "socialUrl");
    if (d.views !== undefined && d.views < 0) fail("Views can't be negative.", "views");
    // An uploaded video only counts while the link still points at it; a pasted link replaces it.
    const uploaded = !!d.videoPublicId && !!videoUrl?.includes(d.videoPublicId);
    return {
      ...d,
      videoUrl,
      socialUrl,
      videoPublicId: uploaded ? d.videoPublicId : undefined,
      videoBytes: uploaded ? d.videoBytes : undefined,
      videoDuration: uploaded ? d.videoDuration : undefined,
    };
  },
  afterWrite: async (ctx, _id, data, previous: Doc<"reels"> | null) => {
    if (previous?.videoPublicId && previous.videoPublicId !== data.videoPublicId) await releaseVideo(ctx, previous.videoPublicId);
  },
  onDelete: async (ctx, doc) => {
    for (const c of await ctx.db.query("caseStudies").collect()) {
      if (c.reelIds.includes(doc._id)) {
        await ctx.db.patch("caseStudies", c._id, { reelIds: c.reelIds.filter((id) => id !== doc._id) });
      }
    }
    // Runs after the reel is gone, so the "still used?" check won't count it.
    await releaseVideo(ctx, doc.videoPublicId);
  },
  duplicate: (doc) => ({
    title: { en: `${doc.title.en} (copy)`, ar: doc.title.ar },
    clientId: doc.clientId,
    format: doc.format,
    video: doc.video,
    videoUrl: doc.videoUrl,
    videoPublicId: doc.videoPublicId,
    videoBytes: doc.videoBytes,
    videoDuration: doc.videoDuration,
    socialUrl: doc.socialUrl,
    poster: doc.poster,
    posterPath: doc.posterPath,
    views: doc.views,
    featured: doc.featured,
    published: false,
  }),
});

/** Cloudinary videos still shown on a reel; anything else of ours can be deleted. */
export const videoPublicIds = internalQuery({
  args: {},
  handler: async (ctx) =>
    (await ctx.db.query("reels").collect()).map((r) => r.videoPublicId).filter((id): id is string => !!id),
});
