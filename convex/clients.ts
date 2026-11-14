import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { makeCrud } from "./lib/crud";
import { assertSlug, fail, normalizeUrl } from "./lib/util";
import { clientFields } from "./lib/validators";

async function uniqueSlug(ctx: MutationCtx, slug: string, id?: string) {
  const other = await ctx.db
    .query("clients")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
  if (other && other._id !== id) fail("Another client already uses this slug.", "slug");
}

export const { list, get, create, update, remove, reorder, setPublished, duplicate } = makeCrud({
  table: "clients",
  fields: clientFields,
  permission: "content",
  entity: "client",
  label: (d) => d.name.en || d.name.ar,
  validate: async (ctx, d, id) => {
    if (!d.name.en.trim() && !d.name.ar.trim()) fail("Add the client's name.", "name");
    assertSlug(d.slug);
    await uniqueSlug(ctx, d.slug, id);
    if (d.followers !== undefined && (d.followers < 0 || !Number.isFinite(d.followers))) {
      fail("Followers must be a positive number.", "followers");
    }
    return { ...d, link: normalizeUrl(d.link) };
  },
  onDelete: async (ctx, doc: Doc<"clients">) => {
    const reels = await ctx.db
      .query("reels")
      .withIndex("by_client", (q) => q.eq("clientId", doc._id))
      .collect();
    for (const r of reels) await ctx.db.patch("reels", r._id, { clientId: undefined });
    for (const c of await ctx.db.query("caseStudies").collect()) {
      if (c.clientId === doc._id) await ctx.db.patch("caseStudies", c._id, { clientId: undefined });
    }
    for (const t of await ctx.db.query("testimonials").collect()) {
      if (t.clientId === doc._id) await ctx.db.patch("testimonials", t._id, { clientId: undefined });
    }
  },
  duplicate: (doc) => ({
    name: { en: `${doc.name.en} (copy)`, ar: doc.name.ar },
    slug: `${doc.slug}-copy-${Date.now().toString(36).slice(-4)}`,
    industry: doc.industry,
    city: doc.city,
    logo: doc.logo,
    logoPath: doc.logoPath,
    followers: doc.followers,
    link: doc.link,
    featured: doc.featured,
    published: false,
  }),
});
