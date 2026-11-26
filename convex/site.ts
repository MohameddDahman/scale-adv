/**
 * Read-only queries for the public website. No authentication: everything
 * returned here is already public (published items only).
 */
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { DEFAULT_SETTINGS } from "./lib/defaults";
import {
  mapById,
  shapeCaseStudy,
  shapeClient,
  shapeFaq,
  shapeJob,
  shapeApplyJob,
  shapeJobSummary,
  shapeReel,
  shapeService,
  shapeSettings,
  shapeTeamMember,
  shapeTestimonial,
  type UrlResolver,
} from "./lib/shape";
import type { SettingsValue } from "./lib/validators";

export async function loadSettings(ctx: QueryCtx): Promise<SettingsValue> {
  const doc = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "site"))
    .unique();
  if (!doc) return DEFAULT_SETTINGS;
   
  // `formats` belonged to the removed "Formats that sell" section; leave it out of what the site gets.
  const { _id, _creationTime, key, formats: _unused, ...rest } = doc;
  return { ...DEFAULT_SETTINGS, ...rest };
}

function resolver(ctx: QueryCtx): UrlResolver {
  return async (id, fallback) => {
    if (id) {
      const found = await ctx.storage.getUrl(id as Id<"_storage">);
      if (found) return found;
    }
    return fallback ?? null;
  };
}

async function contentMaps(ctx: QueryCtx) {
  const clients = await ctx.db.query("clients").withIndex("by_order").collect();
  const reels = await ctx.db.query("reels").withIndex("by_order").collect();
  return { clients, reels, clientMap: mapById(clients), reelMap: mapById(reels) };
}

export const layout = query({
  args: {},
  handler: async (ctx) => {
    const raw = await loadSettings(ctx);
    const settings = await shapeSettings(raw, resolver(ctx));
    const open = (
      await ctx.db
        .query("jobs")
        .withIndex("by_status", (q) => q.eq("status", "open"))
        .collect()
    ).sort((a, b) => a.order - b.order);
    // The "Apply for a job" pop-up on every page lists these.
    return { settings, openRoles: open.length, openJobs: open.map(shapeApplyJob), acceptingOpen: raw.careers.accepting };
  },
});

export const home = query({
  args: {},
  handler: async (ctx) => {
    const url = resolver(ctx);
    const { clients, reels, clientMap, reelMap } = await contentMaps(ctx);
    const published = clients.filter((c) => c.published);
    const services = (await ctx.db.query("services").withIndex("by_order").collect()).filter((s) => s.published);
    const cases = (await ctx.db.query("caseStudies").withIndex("by_order").collect())
      .filter((c) => c.published && c.featured)
      .slice(0, 3);
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
    const testimonials = (await ctx.db.query("testimonials").withIndex("by_order").collect()).filter((t) => t.published);

    return {
      clients: await Promise.all(published.filter((c) => c.featured).map((c) => shapeClient(c, url))),
      audience: published.reduce((sum, c) => sum + (c.followers ?? 0), 0),
      services: services.map(shapeService),
      reels: await Promise.all(
        reels
          .filter((r) => r.published && r.featured)
          .slice(0, 10)
          .map((r) => shapeReel(r, url, clientMap)),
      ),
      caseStudies: await Promise.all(cases.map((c) => shapeCaseStudy(c, url, clientMap, reelMap))),
      jobs: jobs.map(shapeJobSummary),
      testimonials: await Promise.all(testimonials.map((t) => shapeTestimonial(t, url, clientMap))),
    };
  },
});

export const work = query({
  args: {},
  handler: async (ctx) => {
    const url = resolver(ctx);
    const { clients, reels, clientMap, reelMap } = await contentMaps(ctx);
    const cases = (await ctx.db.query("caseStudies").withIndex("by_order").collect()).filter((c) => c.published);
    const published = clients.filter((c) => c.published);
    return {
      reels: await Promise.all(reels.filter((r) => r.published).map((r) => shapeReel(r, url, clientMap))),
      caseStudies: await Promise.all(cases.map((c) => shapeCaseStudy(c, url, clientMap, reelMap))),
      clients: await Promise.all(published.map((c) => shapeClient(c, url))),
      audience: published.reduce((sum, c) => sum + (c.followers ?? 0), 0),
    };
  },
});

export const caseStudy = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const doc = await ctx.db
      .query("caseStudies")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!doc || !doc.published) return null;
    const { clientMap, reelMap } = await contentMaps(ctx);
    return await shapeCaseStudy(doc, resolver(ctx), clientMap, reelMap);
  },
});

export const services = query({
  args: {},
  handler: async (ctx) => {
    const url = resolver(ctx);
    const { clientMap, reelMap } = await contentMaps(ctx);
    const services = (await ctx.db.query("services").withIndex("by_order").collect()).filter((s) => s.published);
    const faqs = (await ctx.db.query("faqs").withIndex("by_order").collect()).filter(
      (f) => f.published && f.scope === "services",
    );
    const cases = (await ctx.db.query("caseStudies").withIndex("by_order").collect())
      .filter((c) => c.published)
      .slice(0, 2);
    return {
      services: services.map(shapeService),
      faqs: faqs.map(shapeFaq),
      caseStudies: await Promise.all(cases.map((c) => shapeCaseStudy(c, url, clientMap, reelMap))),
    };
  },
});

export const careers = query({
  args: {},
  handler: async (ctx) => {
    const url = resolver(ctx);
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
    const faqs = (await ctx.db.query("faqs").withIndex("by_order").collect()).filter(
      (f) => f.published && f.scope === "careers",
    );
    const team = (await ctx.db.query("teamMembers").withIndex("by_order").collect()).filter((m) => m.published);
    return {
      jobs: jobs.map(shapeJobSummary),
      faqs: faqs.map(shapeFaq),
      team: await Promise.all(team.map((m) => shapeTeamMember(m, url))),
    };
  },
});

export const job = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const doc = await ctx.db
      .query("jobs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!doc || doc.status === "draft") return null;
    return shapeJob(doc);
  },
});

export const slugs = query({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("jobs").withIndex("by_order").collect();
    const cases = await ctx.db.query("caseStudies").withIndex("by_order").collect();
    return {
      jobs: jobs.filter((j) => j.status !== "draft").map((j) => ({ slug: j.slug, updatedAt: j.publishedAt ?? j._creationTime })),
      caseStudies: cases.filter((c) => c.published).map((c) => ({ slug: c.slug, updatedAt: c._creationTime })),
    };
  },
});
