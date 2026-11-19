import type { MetadataRoute } from "next";
import { getSlugs } from "@/lib/content";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const { jobs, caseStudies } = await getSlugs();
  const paths = [
    "",
    "/work",
    "/services",
    "/agency",
    "/careers",
    "/careers/apply",
    "/contact",
    ...jobs.map((j) => `/careers/${j.slug}`),
    ...caseStudies.map((c) => `/work/${c.slug}`),
  ];
  return paths.map((path) => ({
    url: `${base}/en${path}`,
    alternates: { languages: { en: `${base}/en${path}`, ar: `${base}/ar${path}` } },
    changeFrequency: path.startsWith("/careers") ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
