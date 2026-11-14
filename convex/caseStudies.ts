import type { MutationCtx } from "./_generated/server";
import { makeCrud } from "./lib/crud";
import { assertSlug, fail } from "./lib/util";
import { caseStudyFields } from "./lib/validators";

async function uniqueSlug(ctx: MutationCtx, slug: string, id?: string) {
  const other = await ctx.db
    .query("caseStudies")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
  if (other && other._id !== id) fail("Another case study already uses this slug.", "slug");
}

export const { list, get, create, update, remove, reorder, setPublished, duplicate } = makeCrud({
  table: "caseStudies",
  fields: caseStudyFields,
  permission: "content",
  entity: "case study",
  label: (d) => d.title.en || d.title.ar,
  validate: async (ctx, d, id) => {
    if (!d.title.en.trim()) fail("Add a title in English.", "title");
    assertSlug(d.slug);
    await uniqueSlug(ctx, d.slug, id);
    return {
      ...d,
      metrics: d.metrics.filter((m) => m.after.trim() && (m.label.en.trim() || m.label.ar.trim())),
      reelIds: [...new Set(d.reelIds)],
    };
  },
  duplicate: (doc) => ({
    slug: `${doc.slug}-copy-${Date.now().toString(36).slice(-4)}`,
    clientId: doc.clientId,
    title: { en: `${doc.title.en} (copy)`, ar: doc.title.ar },
    summary: doc.summary,
    challenge: doc.challenge,
    approach: doc.approach,
    outcome: doc.outcome,
    metrics: doc.metrics,
    cover: doc.cover,
    coverPath: doc.coverPath,
    reelIds: doc.reelIds,
    services: doc.services,
    featured: doc.featured,
    published: false,
  }),
});
