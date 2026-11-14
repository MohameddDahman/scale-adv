import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { logActivity } from "./lib/activity";
import { requireUser } from "./lib/auth";
import { makeCrud } from "./lib/crud";
import { assertSlug, fail } from "./lib/util";
import { DEPARTMENTS, JOB_TYPES, WORKPLACES, jobFields, vJobStatus } from "./lib/validators";

async function uniqueSlug(ctx: MutationCtx, slug: string, id?: string) {
  const other = await ctx.db
    .query("jobs")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
  if (other && other._id !== id) fail("Another role already uses this slug.", "slug");
}

const nonEmpty = (items: { en: string; ar: string }[]) => items.filter((x) => x.en.trim() || x.ar.trim());

const crud = makeCrud({
  table: "jobs",
  fields: jobFields,
  permission: "careers",
  entity: "job",
  label: (d) => d.title.en || d.title.ar,
  validate: async (ctx, d, id) => {
    if (!d.title.en.trim()) fail("Add the role title in English.", "title");
    assertSlug(d.slug);
    await uniqueSlug(ctx, d.slug, id);
    if (!(DEPARTMENTS as readonly string[]).includes(d.department)) fail("Pick a department.", "department");
    if (!(JOB_TYPES as readonly string[]).includes(d.type)) fail("Pick a job type.", "type");
    if (!(WORKPLACES as readonly string[]).includes(d.workplace)) fail("Pick a workplace.", "workplace");
    const ids = new Set<string>();
    for (const q of d.questions) {
      if (!q.label.en.trim() && !q.label.ar.trim()) fail("Every question needs a label.", "questions");
      if (ids.has(q.id)) fail("Two questions share the same id.", "questions");
      ids.add(q.id);
      if (q.kind === "select" && (!q.options || q.options.filter((o) => o.en.trim()).length < 2)) {
        fail("Choice questions need at least two options.", "questions");
      }
    }
    return {
      ...d,
      responsibilities: nonEmpty(d.responsibilities),
      requirements: nonEmpty(d.requirements),
      niceToHave: nonEmpty(d.niceToHave),
      perks: nonEmpty(d.perks),
    };
  },
  afterWrite: async (ctx, id, d, previous: Doc<"jobs"> | null) => {
    if (d.status === "open" && !previous?.publishedAt) {
      await ctx.db.patch("jobs", id, { publishedAt: Date.now() });
    }
  },
  onDelete: async (ctx, doc) => {
    // Keep applications; they still show the role title they applied for.
    const apps = await ctx.db
      .query("applications")
      .withIndex("by_job", (q) => q.eq("jobId", doc._id))
      .collect();
    for (const a of apps) await ctx.db.patch("applications", a._id, { jobId: undefined });
  },
  duplicate: (doc) => ({
    slug: `${doc.slug}-copy-${Date.now().toString(36).slice(-4)}`,
    title: { en: `${doc.title.en} (copy)`, ar: doc.title.ar },
    department: doc.department,
    type: doc.type,
    workplace: doc.workplace,
    location: doc.location,
    summary: doc.summary,
    responsibilities: doc.responsibilities,
    requirements: doc.requirements,
    niceToHave: doc.niceToHave,
    perks: doc.perks,
    salary: doc.salary,
    questions: doc.questions,
    status: "draft" as const,
    featured: false,
    closesAt: doc.closesAt,
  }),
});

export const { get, create, update, remove, reorder, duplicate } = crud;

/** Jobs with application counts per stage, for the careers overview. */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token, "careers");
    const jobs = await ctx.db.query("jobs").withIndex("by_order").collect();
    const apps = await ctx.db.query("applications").collect();
    return jobs.map((job) => {
      const mine = apps.filter((a) => a.jobId === job._id);
      return {
        ...job,
        applications: mine.length,
        newApplications: mine.filter((a) => a.stage === "new").length,
        inPipeline: mine.filter((a) => !["hired", "rejected"].includes(a.stage)).length,
      };
    });
  },
});

export const setStatus = mutation({
  args: { token: v.string(), id: v.id("jobs"), status: vJobStatus },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, "careers");
    const job = await ctx.db.get("jobs", a.id);
    if (!job) return;
    await ctx.db.patch("jobs", a.id, {
      status: a.status,
      ...(a.status === "open" && !job.publishedAt ? { publishedAt: Date.now() } : {}),
    });
    await logActivity(ctx, user, `marked ${a.status}`, "job", job.title.en, a.id);
  },
});

/** Light list for filters and pickers. */
export const options = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token);
    const jobs = await ctx.db.query("jobs").withIndex("by_order").collect();
    return jobs.map((j) => ({ _id: j._id, title: j.title.en || j.title.ar, status: j.status }));
  },
});
