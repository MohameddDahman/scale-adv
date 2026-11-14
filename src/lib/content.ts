/**
 * Cached reads for the public website. Every function is tagged "site" so
 * the dashboard can refresh pages right after an edit (see /api/revalidate);
 * otherwise content refreshes within about a minute.
 */
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { cacheLife, cacheTag } from "next/cache";
import { fallback } from "./fallback";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

async function read<T>(query: (client: ConvexHttpClient) => Promise<T>, offline: () => Promise<T>): Promise<T> {
  if (!CONVEX_URL) return await offline();
  try {
    return await query(new ConvexHttpClient(CONVEX_URL));
  } catch (error) {
    console.error("[content] Convex query failed, serving starter content instead.", error);
    return await offline();
  }
}

export async function getLayoutData() {
  "use cache";
  cacheLife("minutes");
  cacheTag("site");
  return read((c) => c.query(api.site.layout, {}), fallback.layout);
}

export async function getHomeData() {
  "use cache";
  cacheLife("minutes");
  cacheTag("site");
  return read((c) => c.query(api.site.home, {}), fallback.home);
}

export async function getWorkData() {
  "use cache";
  cacheLife("minutes");
  cacheTag("site");
  return read((c) => c.query(api.site.work, {}), fallback.work);
}

export async function getCaseStudy(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("site");
  return read((c) => c.query(api.site.caseStudy, { slug }), () => fallback.caseStudy(slug));
}

export async function getServicesData() {
  "use cache";
  cacheLife("minutes");
  cacheTag("site");
  return read((c) => c.query(api.site.services, {}), fallback.services);
}

export async function getCareersData() {
  "use cache";
  cacheLife("minutes");
  cacheTag("site");
  return read((c) => c.query(api.site.careers, {}), fallback.careers);
}

export async function getJob(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("site");
  return read((c) => c.query(api.site.job, { slug }), () => fallback.job(slug));
}

export async function getSlugs() {
  "use cache";
  cacheLife("minutes");
  cacheTag("site");
  return read((c) => c.query(api.site.slugs, {}), fallback.slugs);
}

export type LayoutData = Awaited<ReturnType<typeof getLayoutData>>;
export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
export type WorkData = Awaited<ReturnType<typeof getWorkData>>;
export type CareersData = Awaited<ReturnType<typeof getCareersData>>;
export type JobData = NonNullable<Awaited<ReturnType<typeof getJob>>>;
