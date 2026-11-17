import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { addEvent, logActivity } from "./lib/activity";
import { requireUser } from "./lib/auth";
import { formatBytes } from "./lib/storage";
import { DAY, fail } from "./lib/util";
import { APP_STAGES, vAppStage, type AppStage } from "./lib/validators";

const STAGE_LABEL: Record<AppStage, string> = {
  new: "New",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Not moving forward",
};

const searchTextOf = (a: Doc<"applications">, tags: string[]) =>
  [a.name, a.email, a.phone, a.jobTitle, a.city, ...tags].filter(Boolean).join(" ");

export const list = query({
  args: {
    token: v.string(),
    stage: v.optional(vAppStage),
    jobId: v.optional(v.id("jobs")),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, "careers");
    const term = a.search?.trim();
    if (term) {
      return await ctx.db
        .query("applications")
        .withSearchIndex("search", (q) => {
          let s = q.search("searchText", term);
          if (a.stage) s = s.eq("stage", a.stage);
          if (a.jobId) s = s.eq("jobId", a.jobId);
          return s;
        })
        .paginate(a.paginationOpts);
    }
    if (a.jobId && a.stage) {
      const { jobId, stage } = a;
      return await ctx.db
        .query("applications")
        .withIndex("by_job_stage", (q) => q.eq("jobId", jobId).eq("stage", stage))
        .order("desc")
        .paginate(a.paginationOpts);
    }
    if (a.jobId) {
      const jobId = a.jobId;
      return await ctx.db
        .query("applications")
        .withIndex("by_job", (q) => q.eq("jobId", jobId))
        .order("desc")
        .paginate(a.paginationOpts);
    }
    if (a.stage) {
      const stage = a.stage;
      return await ctx.db
        .query("applications")
        .withIndex("by_stage", (q) => q.eq("stage", stage))
        .order("desc")
        .paginate(a.paginationOpts);
    }
    return await ctx.db.query("applications").order("desc").paginate(a.paginationOpts);
  },
});

export const board = query({
  args: { token: v.string(), jobId: v.optional(v.id("jobs")) },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, "careers");
    const columns: Record<string, Doc<"applications">[]> = {};
    for (const stage of APP_STAGES) {
      columns[stage] = a.jobId
        ? await ctx.db
            .query("applications")
            .withIndex("by_job_stage", (q) => q.eq("jobId", a.jobId).eq("stage", stage))
            .order("desc")
            .take(80)
        : await ctx.db
            .query("applications")
            .withIndex("by_stage", (q) => q.eq("stage", stage))
            .order("desc")
            .take(80);
    }
    return columns as Record<AppStage, Doc<"applications">[]>;
  },
});

export const counts = query({
  args: { token: v.string(), jobId: v.optional(v.id("jobs")) },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, "careers");
    const out: Record<string, number> = { all: 0 };
    for (const stage of APP_STAGES) {
      const rows = a.jobId
        ? await ctx.db
            .query("applications")
            .withIndex("by_job_stage", (q) => q.eq("jobId", a.jobId).eq("stage", stage))
            .collect()
        : await ctx.db
            .query("applications")
            .withIndex("by_stage", (q) => q.eq("stage", stage))
            .collect();
      out[stage] = rows.length;
      out.all += rows.length;
    }
    return out as Record<AppStage | "all", number>;
  },
});

export const get = query({
  args: { token: v.string(), id: v.id("applications") },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, "careers");
    const app = await ctx.db.get("applications", a.id);
    if (!app) return null;
    const job = app.jobId ? await ctx.db.get("jobs", app.jobId) : null;
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_entity", (q) => q.eq("entity", "application").eq("entityId", a.id))
      .collect();
    const cvUrl = app.cv ? await ctx.storage.getUrl(app.cv) : null;
    const others = (
      await ctx.db
        .query("applications")
        .withIndex("by_email", (q) => q.eq("email", app.email))
        .take(10)
    ).filter((x) => x._id !== app._id);
    return {
      application: app,
      job: job ? { _id: job._id, title: job.title, slug: job.slug, questions: job.questions, status: job.status } : null,
      notes,
      cvUrl,
      otherApplications: others.map((o) => ({ _id: o._id, jobTitle: o.jobTitle, stage: o.stage, createdAt: o._creationTime })),
    };
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("applications"),
    stage: v.optional(vAppStage),
    rating: v.optional(v.union(v.number(), v.null())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, "careers");
    const app = await ctx.db.get("applications", a.id);
    if (!app) fail("This application no longer exists.");
    const patch: Partial<Doc<"applications">> = { updatedAt: Date.now() };
    if (a.stage && a.stage !== app.stage) {
      patch.stage = a.stage;
      await addEvent(ctx, "application", a.id, user, `Moved from ${STAGE_LABEL[app.stage]} to ${STAGE_LABEL[a.stage]}`);
      await logActivity(ctx, user, `moved to ${STAGE_LABEL[a.stage]}`, "application", `${app.name} — ${app.jobTitle}`, a.id);
    }
    if (a.rating !== undefined) {
      const rating = a.rating === null ? undefined : Math.max(1, Math.min(5, Math.round(a.rating)));
      patch.rating = rating;
      await addEvent(ctx, "application", a.id, user, rating ? `Rated ${rating}/5` : "Rating cleared");
    }
    if (a.tags) {
      patch.tags = [...new Set(a.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
      patch.searchText = searchTextOf(app, patch.tags);
    }
    await ctx.db.patch("applications", a.id, patch);
  },
});

export const updateMany = mutation({
  args: { token: v.string(), ids: v.array(v.id("applications")), stage: vAppStage },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, "careers");
    for (const id of a.ids) {
      const app = await ctx.db.get("applications", id);
      if (!app || app.stage === a.stage) continue;
      await ctx.db.patch("applications", id, { stage: a.stage, updatedAt: Date.now() });
      await addEvent(ctx, "application", id, user, `Moved from ${STAGE_LABEL[app.stage]} to ${STAGE_LABEL[a.stage]}`);
    }
    await logActivity(ctx, user, `moved ${a.ids.length} to ${STAGE_LABEL[a.stage]}`, "application", "Bulk update");
  },
});

export const remove = mutation({
  args: { token: v.string(), ids: v.array(v.id("applications")) },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, "careers");
    for (const id of a.ids) {
      const app = await ctx.db.get("applications", id);
      if (!app) continue;
      if (app.cv && (await ctx.db.system.get("_storage", app.cv))) await ctx.storage.delete(app.cv);
      const notes = await ctx.db
        .query("notes")
        .withIndex("by_entity", (q) => q.eq("entity", "application").eq("entityId", id))
        .collect();
      for (const n of notes) await ctx.db.delete("notes", n._id);
      await ctx.db.delete("applications", id);
    }
    await logActivity(ctx, user, "deleted", "application", `${a.ids.length} application${a.ids.length === 1 ? "" : "s"}`);
  },
});

/* --------------------------- Free up space --------------------------- */

const vCleanup = { token: v.string(), olderThanDays: v.number(), stages: v.array(vAppStage) };

async function cleanupCandidates(
  ctx: QueryCtx,
  a: { olderThanDays: number; stages: AppStage[] },
): Promise<Doc<"applications">[]> {
  const cutoff = Date.now() - Math.max(30, a.olderThanDays) * DAY;
  const out: Doc<"applications">[] = [];
  for (const stage of [...new Set(a.stages)]) {
    const rows = await ctx.db
      .query("applications")
      .withIndex("by_stage", (q) => q.eq("stage", stage))
      .collect();
    for (const r of rows) if (r.cv && r.updatedAt < cutoff) out.push(r);
  }
  return out;
}

/** How many CV files a cleanup would delete, and how much space it frees. */
export const cvCleanupPreview = query({
  args: vCleanup,
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, "careers");
    const rows = await cleanupCandidates(ctx, a);
    return { count: rows.length, bytes: rows.reduce((sum, r) => sum + (r.cvSize ?? 0), 0) };
  },
});

/**
 * Deletes the CV files (not the applications) of candidates in the chosen
 * stages that haven't changed for a while. Name, phone, answers and notes
 * stay; the application shows when the file was removed.
 */
export const purgeCvFiles = mutation({
  args: vCleanup,
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, "careers");
    if (a.olderThanDays < 30) fail("Pick 30 days or more.");
    const rows = await cleanupCandidates(ctx, a);
    const batch = rows.slice(0, 150);
    const now = Date.now();
    let bytes = 0;
    for (const r of batch) {
      if (!r.cv) continue;
      if (await ctx.db.system.get("_storage", r.cv)) await ctx.storage.delete(r.cv);
      await ctx.db.patch("applications", r._id, { cv: undefined, cvRemovedAt: now });
      await addEvent(ctx, "application", r._id, user, "CV file deleted to free up storage");
      bytes += r.cvSize ?? 0;
    }
    if (batch.length) {
      await logActivity(ctx, user, "deleted CV files", "application", `${batch.length} CV file${batch.length === 1 ? "" : "s"} (${formatBytes(bytes)})`);
    }
    return { removed: batch.length, bytes, remaining: rows.length - batch.length };
  },
});

export const exportAll = query({
  args: { token: v.string(), jobId: v.optional(v.id("jobs")), stage: v.optional(vAppStage) },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, "careers");
    let rows = await ctx.db.query("applications").order("desc").collect();
    if (a.jobId) rows = rows.filter((r) => r.jobId === a.jobId);
    if (a.stage) rows = rows.filter((r) => r.stage === a.stage);
    return await Promise.all(
      rows.map(async (r) => ({
        received: new Date(r._creationTime).toISOString(),
        role: r.jobTitle,
        stage: STAGE_LABEL[r.stage],
        rating: r.rating ?? "",
        name: r.name,
        email: r.email,
        phone: r.phone,
        city: r.city ?? "",
        experience: r.experience ?? "",
        portfolio: r.portfolioUrl ?? "",
        profile: r.profileUrl ?? "",
        cv: r.cv ? ((await ctx.storage.getUrl(r.cv)) ?? "") : "",
        expected_salary: r.expectedSalary ?? "",
        start_date: r.startDate ?? "",
        cover_note: r.coverNote ?? "",
        answers: r.answers.map((x) => `${x.label}: ${x.value}`).join(" | "),
        tags: r.tags.join(" | "),
      })),
    );
  },
});
