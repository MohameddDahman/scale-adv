/**
 * Turns stored documents into the shapes the public website renders.
 * Pure functions: the Convex queries and the website's offline fallback
 * both use them, so the two can never drift apart.
 */
import type { Doc } from "../_generated/dataModel";
import type { SettingsValue, Text } from "./validators";

export type UrlResolver = (id: string | undefined, fallback?: string) => Promise<string | null>;

export type PublicClient = {
  id: string;
  slug: string;
  name: Text;
  industry: Text;
  city: Text;
  logo: string | null;
  followers: number | null;
  link: string | null;
};

export async function shapeClient(c: Doc<"clients">, url: UrlResolver): Promise<PublicClient> {
  return {
    id: c._id,
    slug: c.slug,
    name: c.name,
    industry: c.industry,
    city: c.city,
    logo: await url(c.logo, c.logoPath),
    followers: c.followers ?? null,
    link: c.link ?? null,
  };
}

export type PublicService = {
  id: string;
  verb: Text;
  title: Text;
  summary: Text;
  deliverables: Text[];
};

export function shapeService(s: Doc<"services">): PublicService {
  return { id: s._id, verb: s.verb, title: s.title, summary: s.summary, deliverables: s.deliverables };
}

/** YouTube links become privacy-friendly embeds; other social links open in a new tab. */
export function youtubeEmbed(link: string | undefined): string | null {
  if (!link) return null;
  try {
    const u = new URL(link);
    let id: string | null = null;
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    else if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2] ?? null;
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] ?? null;
      else id = u.searchParams.get("v");
    }
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null;
  } catch {
    return null;
  }
}

const isDirectVideo = (link?: string) => !!link && /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(link);

export type PublicReel = {
  id: string;
  title: Text;
  format: string;
  poster: string | null;
  video: string | null;
  embed: string | null;
  link: string | null;
  views: number | null;
  client: Text | null;
  clientSlug: string | null;
};

export async function shapeReel(
  r: Doc<"reels">,
  url: UrlResolver,
  clients: Map<string, Doc<"clients">>,
): Promise<PublicReel> {
  const client = r.clientId ? clients.get(r.clientId) : undefined;
  return {
    id: r._id,
    title: r.title,
    format: r.format,
    poster: await url(r.poster, r.posterPath),
    video: await url(r.video, isDirectVideo(r.videoUrl) ? r.videoUrl : undefined),
    embed: youtubeEmbed(r.videoUrl),
    link: r.socialUrl ?? (r.videoUrl && !isDirectVideo(r.videoUrl) && !youtubeEmbed(r.videoUrl) ? r.videoUrl : null),
    views: r.views ?? null,
    client: client?.name ?? null,
    clientSlug: client?.slug ?? null,
  };
}

export type PublicJobSummary = {
  id: string;
  slug: string;
  title: Text;
  department: string;
  type: string;
  workplace: string;
  location: Text;
  summary: Text;
  featured: boolean;
  status: "draft" | "open" | "closed";
  publishedAt: number | null;
};

export function shapeJobSummary(j: Doc<"jobs">): PublicJobSummary {
  return {
    id: j._id,
    slug: j.slug,
    title: j.title,
    department: j.department,
    type: j.type,
    workplace: j.workplace,
    location: j.location,
    summary: j.summary,
    featured: j.featured,
    status: j.status,
    publishedAt: j.publishedAt ?? j._creationTime,
  };
}

export type PublicJob = PublicJobSummary & {
  responsibilities: Text[];
  requirements: Text[];
  niceToHave: Text[];
  perks: Text[];
  salary: Text;
  questions: Doc<"jobs">["questions"];
  closesAt: number | null;
};

export function shapeJob(j: Doc<"jobs">): PublicJob {
  return {
    ...shapeJobSummary(j),
    responsibilities: j.responsibilities,
    requirements: j.requirements,
    niceToHave: j.niceToHave,
    perks: j.perks,
    salary: j.salary,
    questions: j.questions,
    closesAt: j.closesAt ?? null,
  };
}

export type PublicCaseStudy = {
  id: string;
  slug: string;
  title: Text;
  summary: Text;
  challenge: Text;
  approach: Text;
  outcome: Text;
  metrics: Doc<"caseStudies">["metrics"];
  cover: string | null;
  services: string[];
  client: PublicClient | null;
  reels: PublicReel[];
};

export async function shapeCaseStudy(
  c: Doc<"caseStudies">,
  url: UrlResolver,
  clients: Map<string, Doc<"clients">>,
  reels: Map<string, Doc<"reels">>,
): Promise<PublicCaseStudy> {
  const client = c.clientId ? clients.get(c.clientId) : undefined;
  const linked = c.reelIds.map((id) => reels.get(id)).filter((r): r is Doc<"reels"> => !!r && r.published);
  return {
    id: c._id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    challenge: c.challenge,
    approach: c.approach,
    outcome: c.outcome,
    metrics: c.metrics,
    cover: await url(c.cover, c.coverPath),
    services: c.services,
    client: client ? await shapeClient(client, url) : null,
    reels: await Promise.all(linked.map((r) => shapeReel(r, url, clients))),
  };
}

export type PublicFaq = { id: string; question: Text; answer: Text; scope: "services" | "careers" };
export function shapeFaq(f: Doc<"faqs">): PublicFaq {
  return { id: f._id, question: f.question, answer: f.answer, scope: f.scope };
}

export type PublicTestimonial = {
  id: string;
  quote: Text;
  author: string;
  role: Text;
  photo: string | null;
  client: Text | null;
};
export async function shapeTestimonial(
  t: Doc<"testimonials">,
  url: UrlResolver,
  clients: Map<string, Doc<"clients">>,
): Promise<PublicTestimonial> {
  const client = t.clientId ? clients.get(t.clientId) : undefined;
  return {
    id: t._id,
    quote: t.quote,
    author: t.author,
    role: t.role,
    photo: await url(t.photo, t.photoPath),
    client: client?.name ?? null,
  };
}

export type PublicTeamMember = {
  id: string;
  name: Text;
  role: Text;
  bio: Text;
  photo: string | null;
  instagram: string | null;
};
export async function shapeTeamMember(m: Doc<"teamMembers">, url: UrlResolver): Promise<PublicTeamMember> {
  return {
    id: m._id,
    name: m.name,
    role: m.role,
    bio: m.bio,
    photo: await url(m.photo, m.photoPath),
    instagram: m.instagram ?? null,
  };
}

export type PublicSettings = Omit<SettingsValue, "seo"> & {
  seo: { title: Text; description: Text; ogImage: string | null };
};

export async function shapeSettings(s: SettingsValue, url: UrlResolver): Promise<PublicSettings> {
  return {
    ...s,
    seo: { title: s.seo.title, description: s.seo.description, ogImage: await url(s.seo.ogImage) },
  };
}

export function mapById<T extends { _id: string }>(docs: T[]): Map<string, T> {
  return new Map(docs.map((d) => [d._id, d]));
}
