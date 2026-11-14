import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { can, getSession, requireUser } from "./lib/auth";
import { DAY } from "./lib/util";
import { APP_STAGES, LEAD_STATUSES } from "./lib/validators";

/**
 * Numbers for the overview screen. Time series are returned as raw
 * timestamps so the browser can bucket them in the viewer's own timezone.
 */
export const overview = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token, "dashboard");
    const now = Date.now();
    const since = now - 60 * DAY;

    let leads = null;
    if (can(user.role, "leads")) {
      const recent = await ctx.db
        .query("leads")
        .withIndex("by_creation_time", (q) => q.gt("_creationTime", since))
        .collect();
      const byStatus: Record<string, number> = {};
      let wonValue = 0;
      let total = 0;
      for (const status of LEAD_STATUSES) {
        const rows = await ctx.db
          .query("leads")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect();
        byStatus[status] = rows.length;
        total += rows.length;
        if (status === "won") wonValue = rows.reduce((s, r) => s + (r.value ?? 0), 0);
      }
      const followUps = (
        await ctx.db
          .query("leads")
          .withIndex("by_followUp", (q) => q.gt("followUpAt", 0).lte("followUpAt", now + 7 * DAY))
          .collect()
      )
        .filter((l) => l.status !== "won" && l.status !== "lost")
        .slice(0, 8)
        .map((l) => ({ _id: l._id, name: l.name, company: l.company, followUpAt: l.followUpAt!, status: l.status }));
      const services: Record<string, number> = {};
      for (const l of recent) for (const s of l.services) services[s] = (services[s] ?? 0) + 1;
      leads = {
        times: recent.map((l) => l._creationTime),
        byStatus,
        total,
        wonValue,
        followUps,
        services,
        latest: recent
          .slice(-5)
          .reverse()
          .map((l) => ({ _id: l._id, name: l.name, company: l.company, status: l.status, createdAt: l._creationTime })),
      };
    }

    let careers = null;
    if (can(user.role, "careers")) {
      const recent = await ctx.db
        .query("applications")
        .withIndex("by_creation_time", (q) => q.gt("_creationTime", since))
        .collect();
      const byStage: Record<string, number> = {};
      let total = 0;
      for (const stage of APP_STAGES) {
        const n = (
          await ctx.db
            .query("applications")
            .withIndex("by_stage", (q) => q.eq("stage", stage))
            .collect()
        ).length;
        byStage[stage] = n;
        total += n;
      }
      const jobs = await ctx.db
        .query("jobs")
        .withIndex("by_status", (q) => q.eq("status", "open"))
        .collect();
      const perJob = await Promise.all(
        jobs.map(async (j) => ({
          _id: j._id,
          title: j.title.en || j.title.ar,
          count: (
            await ctx.db
              .query("applications")
              .withIndex("by_job", (q) => q.eq("jobId", j._id))
              .collect()
          ).length,
        })),
      );
      careers = {
        times: recent.map((a) => a._creationTime),
        byStage,
        total,
        openRoles: jobs.length,
        perJob: perJob.sort((a, b) => b.count - a.count),
        latest: recent
          .slice(-5)
          .reverse()
          .map((a) => ({ _id: a._id, name: a.name, jobTitle: a.jobTitle, stage: a.stage, createdAt: a._creationTime })),
      };
    }

    let content = null;
    if (can(user.role, "content")) {
      const reels = await ctx.db.query("reels").collect();
      const clients = await ctx.db.query("clients").collect();
      const cases = await ctx.db.query("caseStudies").collect();
      const services = await ctx.db.query("services").first();
      content = {
        reels: reels.filter((r) => r.published).length,
        reelsMissingMedia: reels.filter((r) => r.published && !r.video && !r.videoUrl).length,
        clients: clients.filter((c) => c.published).length,
        caseStudies: cases.filter((c) => c.published).length,
        caseStudyDrafts: cases.filter((c) => !c.published).length,
        empty: !services && clients.length === 0,
      };
    }

    let activity = null;
    if (can(user.role, "activity")) {
      activity = await ctx.db.query("activity").order("desc").take(8);
    }

    return { now, leads, careers, content, activity };
  },
});

export const badges = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    const found = await getSession(ctx, token);
    if (!found) return { newLeads: 0, newApplications: 0 };
    const u = found.user;
    const newLeads = can(u.role, "leads")
      ? (
          await ctx.db
            .query("leads")
            .withIndex("by_creation_time", (q) => q.gt("_creationTime", u.lastSeenLeadsAt))
            .take(100)
        ).length
      : 0;
    const newApplications = can(u.role, "careers")
      ? (
          await ctx.db
            .query("applications")
            .withIndex("by_creation_time", (q) => q.gt("_creationTime", u.lastSeenApplicationsAt))
            .take(100)
        ).length
      : 0;
    return { newLeads, newApplications };
  },
});

export const markSeen = mutation({
  args: { token: v.string(), area: v.union(v.literal("leads"), v.literal("applications")) },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token);
    await ctx.db.patch(
      "users",
      user._id,
      a.area === "leads" ? { lastSeenLeadsAt: Date.now() } : { lastSeenApplicationsAt: Date.now() },
    );
  },
});
