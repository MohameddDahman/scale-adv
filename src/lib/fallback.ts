/**
 * Offline copy of the public data, built from the same starter content and
 * shaping functions Convex uses. The site renders with this until
 * NEXT_PUBLIC_CONVEX_URL is set, so it can be previewed before setup.
 */
import type { Doc } from "@convex/_generated/dataModel";
import {
  DEFAULT_CASE_STUDIES,
  DEFAULT_CLIENTS,
  DEFAULT_FAQS,
  DEFAULT_JOBS,
  DEFAULT_REELS,
  DEFAULT_SERVICES,
  DEFAULT_SETTINGS,
} from "@convex/lib/defaults";
import {
  mapById,
  shapeCaseStudy,
  shapeClient,
  shapeApplyJob,
  shapeFaq,
  shapeJob,
  shapeJobSummary,
  shapeReel,
  shapeService,
  shapeSettings,
  type UrlResolver,
} from "@convex/lib/shape";

const url: UrlResolver = async (_id, fallback) => fallback ?? null;
const doc = <T>(table: string, i: number, data: object) =>
  ({ _id: `${table}${i}`, _creationTime: 0, order: i, ...data }) as T;

const clients = DEFAULT_CLIENTS.map((c, i) => doc<Doc<"clients">>("clients", i, c));
const clientBySlug = new Map(clients.map((c) => [c.slug, c]));
const reels = DEFAULT_REELS.map(({ clientSlug, ...r }, i) =>
  doc<Doc<"reels">>("reels", i, { ...r, clientId: clientSlug ? clientBySlug.get(clientSlug)?._id : undefined }),
);
const services = DEFAULT_SERVICES.map((s, i) => doc<Doc<"services">>("services", i, s));
const jobs = DEFAULT_JOBS.map((j, i) => doc<Doc<"jobs">>("jobs", i, j));
const faqs = DEFAULT_FAQS.map((f, i) => doc<Doc<"faqs">>("faqs", i, f));
const cases = DEFAULT_CASE_STUDIES.map(({ clientSlug, ...c }, i) =>
  doc<Doc<"caseStudies">>("caseStudies", i, { ...c, clientId: clientSlug ? clientBySlug.get(clientSlug)?._id : undefined }),
);
const clientMap = mapById(clients);
const reelMap = mapById(reels);
const audience = clients.filter((c) => c.published).reduce((s, c) => s + (c.followers ?? 0), 0);
const openJobs = jobs.filter((j) => j.status === "open");
const publishedCases = cases.filter((c) => c.published);

export const fallback = {
  layout: async () => ({
    settings: await shapeSettings(DEFAULT_SETTINGS, url),
    openRoles: openJobs.length,
    openJobs: openJobs.map(shapeApplyJob),
    acceptingOpen: DEFAULT_SETTINGS.careers.accepting,
  }),
  home: async () => ({
    clients: await Promise.all(clients.filter((c) => c.published && c.featured).map((c) => shapeClient(c, url))),
    audience,
    services: services.map(shapeService),
    reels: await Promise.all(reels.filter((r) => r.published && r.featured).map((r) => shapeReel(r, url, clientMap))),
    caseStudies: await Promise.all(
      publishedCases.filter((c) => c.featured).map((c) => shapeCaseStudy(c, url, clientMap, reelMap)),
    ),
    jobs: openJobs.map(shapeJobSummary),
    testimonials: [],
  }),
  work: async () => ({
    reels: await Promise.all(reels.filter((r) => r.published).map((r) => shapeReel(r, url, clientMap))),
    caseStudies: await Promise.all(publishedCases.map((c) => shapeCaseStudy(c, url, clientMap, reelMap))),
    clients: await Promise.all(clients.filter((c) => c.published).map((c) => shapeClient(c, url))),
    audience,
  }),
  caseStudy: async (slug: string) => {
    const found = publishedCases.find((c) => c.slug === slug);
    return found ? await shapeCaseStudy(found, url, clientMap, reelMap) : null;
  },
  services: async () => ({
    services: services.map(shapeService),
    faqs: faqs.filter((f) => f.scope === "services").map(shapeFaq),
    caseStudies: await Promise.all(publishedCases.slice(0, 2).map((c) => shapeCaseStudy(c, url, clientMap, reelMap))),
  }),
  careers: async () => ({
    jobs: openJobs.map(shapeJobSummary),
    faqs: faqs.filter((f) => f.scope === "careers").map(shapeFaq),
    team: [],
  }),
  job: async (slug: string) => {
    const found = jobs.find((j) => j.slug === slug && j.status !== "draft");
    return found ? shapeJob(found) : null;
  },
  slugs: async () => ({
    jobs: jobs.filter((j) => j.status !== "draft").map((j) => ({ slug: j.slug, updatedAt: 0 })),
    caseStudies: publishedCases.map((c) => ({ slug: c.slug, updatedAt: 0 })),
  }),
};
