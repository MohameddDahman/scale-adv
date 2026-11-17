/**
 * Cached reads for the public website.
 *
 * Every function is tagged "site", and the dashboard refreshes the website
 * right after each save (see /api/revalidate). Because of that, pages can
 * stay cached for a day: the number of Convex calls and database reads (both
 * limited on the free plan) then stays flat no matter how many people visit.
 */
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { cacheLife, cacheTag } from "next/cache";
import { fallback } from "./fallback";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

/** Called inside each "use cache" function; sets that entry's lifetime (exactly one cacheLife per run). */
async function read<T>(query: (client: ConvexHttpClient) => Promise<T>, offline: () => Promise<T>): Promise<T> {
  if (!CONVEX_URL) {
    cacheLife("days");
    return await offline();
  }
  try {
    const data = await query(new ConvexHttpClient(CONVEX_URL));
    cacheLife("days");
    return data;
  } catch (error) {
    console.error("[content] Convex query failed, serving starter content instead.", error);
    // Keep the stand-in content only briefly so the real content comes back soon.
    cacheLife("minutes");
    return await offline();
  }
}

export async function getLayoutData() {
  "use cache";
  cacheTag("site");
  return read((c) => c.query(api.site.layout, {}), fallback.layout);
}

export async function getHomeData() {
  "use cache";
  cacheTag("site");
  return read((c) => c.query(api.site.home, {}), fallback.home);
}

export async function getWorkData() {
  "use cache";
  cacheTag("site");
  return read((c) => c.query(api.site.work, {}), fallback.work);
}

export async function getCaseStudy(slug: string) {
  "use cache";
  cacheTag("site");
  return read((c) => c.query(api.site.caseStudy, { slug }), () => fallback.caseStudy(slug));
}

export async function getServicesData() {
  "use cache";
  cacheTag("site");
  return read((c) => c.query(api.site.services, {}), fallback.services);
}

export async function getCareersData() {
  "use cache";
  cacheTag("site");
  return read((c) => c.query(api.site.careers, {}), fallback.careers);
}

export async function getJob(slug: string) {
  "use cache";
  cacheTag("site");
  return read((c) => c.query(api.site.job, { slug }), () => fallback.job(slug));
}

export async function getSlugs() {
  "use cache";
  cacheTag("site");
  return read((c) => c.query(api.site.slugs, {}), fallback.slugs);
}

export type LayoutData = Awaited<ReturnType<typeof getLayoutData>>;
export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
export type WorkData = Awaited<ReturnType<typeof getWorkData>>;
export type CareersData = Awaited<ReturnType<typeof getCareersData>>;
export type JobData = NonNullable<Awaited<ReturnType<typeof getJob>>>;
