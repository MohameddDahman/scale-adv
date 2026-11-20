import { query } from "./_generated/server";
import { makeCrud } from "./lib/crud";
import { sha256Hex } from "./lib/sha256";
import { fail, normalizeUrl } from "./lib/util";
import { REEL_FORMATS, reelFields } from "./lib/validators";

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
  onDelete: async (ctx, doc) => {
    for (const c of await ctx.db.query("caseStudies").collect()) {
      if (c.reelIds.includes(doc._id)) {
        await ctx.db.patch("caseStudies", c._id, { reelIds: c.reelIds.filter((id) => id !== doc._id) });
      }
    }
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

/** The public ID inside a Cloudinary video link: …/video/upload/<settings>/v123/<public id>.mp4 */
function cloudinaryVideoId(url: string | undefined) {
  const m = url ? /^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/([^?#]+)/i.exec(url) : null;
  if (!m) return null;
  const parts = m[1].split("/");
  while (parts.length > 1 && (/^v\d+$/.test(parts[0]) || /^[a-z]{1,3}_/.test(parts[0]))) parts.shift();
  return parts.join("/").replace(/\.[a-z0-9]{2,4}$/i, "") || null;
}

/**
 * Which Cloudinary videos the reels use, as SHA-256 hashes of their public
 * IDs. The website's daily clean-up (src/app/api/cloudinary/cleanup) deletes
 * dashboard uploads that aren't listed. Hashed, so the videos of unpublished
 * reels stay private.
 */
export const videoKeys = query({
  args: {},
  handler: async (ctx) => {
    const ids = new Set<string>();
    for (const r of await ctx.db.query("reels").collect()) {
      if (r.videoPublicId) ids.add(r.videoPublicId);
      const linked = cloudinaryVideoId(r.videoUrl);
      if (linked) ids.add(linked);
    }
    return [...ids].map((id) => sha256Hex(id));
  },
});
