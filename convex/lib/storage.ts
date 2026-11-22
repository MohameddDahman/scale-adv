/**
 * File storage rules. The project runs on Convex's free plan, which includes
 * 1 GB of stored files and 1 GB of file downloads a month, so every file that
 * reaches storage is checked here, and nothing is kept that isn't used.
 */
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export const FREE_PLAN = {
  fileStorageBytes: 1024 ** 3,
  fileDownloadsBytes: 1024 ** 3,
} as const;

/**
 * Dashboard images are shrunk in the browser first (src/lib/image-compress.ts),
 * so a real upload is a few hundred KB at most. Anything over this skipped
 * compression and is refused.
 */
export const MAX_IMAGE_BYTES = 1024 * 1024;
export const IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"];

/** Applicants' CVs from the careers form. Photos of CVs are shrunk in the browser first. */
export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function formatBytes(n: number) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

export type StorageRef = { label: string; href: string };

/** Every stored file the website points at, and where it's used. */
export async function storageReferences(ctx: QueryCtx): Promise<Map<string, StorageRef[]>> {
  const refs = new Map<string, StorageRef[]>();
  const add = (id: Id<"_storage"> | undefined, label: string, href: string) => {
    if (!id) return;
    refs.set(id, [...(refs.get(id) ?? []), { label, href }]);
  };
  for (const c of await ctx.db.query("clients").collect()) {
    add(c.logo, `Logo · ${c.name.en || c.name.ar}`, `/admin/clients/${c._id}`);
  }
  for (const r of await ctx.db.query("reels").collect()) {
    const title = r.title.en || r.title.ar;
    add(r.poster, `Reel cover · ${title}`, `/admin/work/${r._id}`);
    add(r.video, `Reel video · ${title}`, `/admin/work/${r._id}`);
  }
  for (const c of await ctx.db.query("caseStudies").collect()) {
    add(c.cover, `Case study · ${c.title.en || c.title.ar}`, `/admin/case-studies/${c._id}`);
  }
  for (const t of await ctx.db.query("testimonials").collect()) {
    add(t.photo, `Testimonial · ${t.author}`, `/admin/testimonials/${t._id}`);
  }
  for (const m of await ctx.db.query("teamMembers").collect()) {
    add(m.photo, `Team · ${m.name.en || m.name.ar}`, `/admin/team/${m._id}`);
  }
  const settings = await ctx.db.query("settings").first();
  add(settings?.seo.ogImage, "Share image · Site settings", "/admin/settings");
  for (const f of settings?.formats ?? []) {
    add(f.image, `Format card · ${f.name.en || f.name.ar}`, "/admin/settings");
  }
  return refs;
}

/** Takes a deleted file off anything that still shows it, so no page points at a missing file. */
export async function clearReferences(ctx: MutationCtx, id: Id<"_storage">) {
  for (const c of await ctx.db.query("clients").collect()) {
    if (c.logo === id) await ctx.db.patch("clients", c._id, { logo: undefined });
  }
  for (const r of await ctx.db.query("reels").collect()) {
    if (r.poster === id) await ctx.db.patch("reels", r._id, { poster: undefined });
    if (r.video === id) await ctx.db.patch("reels", r._id, { video: undefined });
  }
  for (const c of await ctx.db.query("caseStudies").collect()) {
    if (c.cover === id) await ctx.db.patch("caseStudies", c._id, { cover: undefined });
  }
  for (const t of await ctx.db.query("testimonials").collect()) {
    if (t.photo === id) await ctx.db.patch("testimonials", t._id, { photo: undefined });
  }
  for (const m of await ctx.db.query("teamMembers").collect()) {
    if (m.photo === id) await ctx.db.patch("teamMembers", m._id, { photo: undefined });
  }
  const settings = await ctx.db.query("settings").first();
  if (settings?.seo.ogImage === id) {
    const { ogImage: _removed, ...seo } = settings.seo;
    await ctx.db.patch("settings", settings._id, { seo });
  }
  if (settings?.formats?.some((f) => f.image === id)) {
    const formats = settings.formats.map(({ image, ...rest }) => (image === id ? rest : { ...rest, image }));
    await ctx.db.patch("settings", settings._id, { formats });
  }
}
