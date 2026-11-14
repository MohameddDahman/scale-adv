import { makeCrud } from "./lib/crud";
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
    return { ...d, videoUrl, socialUrl };
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
    socialUrl: doc.socialUrl,
    poster: doc.poster,
    posterPath: doc.posterPath,
    views: doc.views,
    featured: doc.featured,
    published: false,
  }),
});
