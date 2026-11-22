import { v, type Infer } from "convex/values";

/** Bilingual text. Arabic falls back to English on the site when empty. */
export const vText = v.object({ en: v.string(), ar: v.string() });
export type Text = Infer<typeof vText>;

export const vLocale = v.union(v.literal("en"), v.literal("ar"));

export const ROLES = ["owner", "admin", "editor", "recruiter", "sales"] as const;
export type Role = (typeof ROLES)[number];
export const vRole = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("editor"),
  v.literal("recruiter"),
  v.literal("sales"),
);

export const LEAD_STATUSES = ["new", "contacted", "proposal", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const vLeadStatus = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("proposal"),
  v.literal("won"),
  v.literal("lost"),
);

/** "Become our client", first question: what matters most for their content. */
export const LEAD_PRIORITIES = ["quality", "speed"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export const vLeadPriority = v.union(v.literal("quality"), v.literal("speed"));

export const APP_STAGES = ["new", "screening", "interview", "offer", "hired", "rejected"] as const;
export type AppStage = (typeof APP_STAGES)[number];
export const vAppStage = v.union(
  v.literal("new"),
  v.literal("screening"),
  v.literal("interview"),
  v.literal("offer"),
  v.literal("hired"),
  v.literal("rejected"),
);

export const JOB_STATUSES = ["draft", "open", "closed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const vJobStatus = v.union(v.literal("draft"), v.literal("open"), v.literal("closed"));

export const JOB_TYPES = ["full_time", "part_time", "internship", "freelance", "talent"] as const;
export const WORKPLACES = ["onsite", "hybrid", "remote"] as const;
export const DEPARTMENTS = [
  "production",
  "content",
  "media_buying",
  "design",
  "accounts",
  "operations",
] as const;
export const REEL_FORMATS = [
  "skit",
  "pov",
  "storytelling",
  "product",
  "voxpop",
  "ugc",
  "bts",
  "ad",
  "motion",
] as const;
/** The Work page's two groups, matching the "Content creation" and "Media production" services. */
export const REEL_CATEGORIES = ["content", "production"] as const;

export const vQuestion = v.object({
  id: v.string(),
  label: vText,
  kind: v.union(
    v.literal("short"),
    v.literal("long"),
    v.literal("url"),
    v.literal("yesno"),
    v.literal("select"),
  ),
  options: v.optional(v.array(vText)),
  required: v.boolean(),
});
export type Question = Infer<typeof vQuestion>;

export const vMetric = v.object({
  label: vText,
  before: v.optional(v.string()),
  after: v.string(),
});

/* ------------------------------------------------------------------ */
/* Editable content collections. `order` is managed by the CRUD layer. */
/* ------------------------------------------------------------------ */

export const clientFields = {
  name: vText,
  slug: v.string(),
  industry: vText,
  city: vText,
  logo: v.optional(v.id("_storage")),
  logoPath: v.optional(v.string()),
  followers: v.optional(v.number()),
  link: v.optional(v.string()),
  featured: v.boolean(),
  published: v.boolean(),
};

export const serviceFields = {
  verb: vText,
  title: vText,
  summary: vText,
  deliverables: v.array(vText),
  published: v.boolean(),
};

export const reelFields = {
  title: vText,
  clientId: v.optional(v.id("clients")),
  format: v.string(),
  /** "content" or "production" (REEL_CATEGORIES); groups the Work page. */
  category: v.optional(v.string()),
  video: v.optional(v.id("_storage")),
  videoUrl: v.optional(v.string()),
  /** Set when the video was uploaded to Cloudinary from the dashboard; used to delete it later. */
  videoPublicId: v.optional(v.string()),
  videoBytes: v.optional(v.number()),
  videoDuration: v.optional(v.number()),
  socialUrl: v.optional(v.string()),
  poster: v.optional(v.id("_storage")),
  posterPath: v.optional(v.string()),
  views: v.optional(v.number()),
  featured: v.boolean(),
  published: v.boolean(),
};

export const caseStudyFields = {
  slug: v.string(),
  clientId: v.optional(v.id("clients")),
  title: vText,
  summary: vText,
  challenge: vText,
  approach: vText,
  outcome: vText,
  metrics: v.array(vMetric),
  cover: v.optional(v.id("_storage")),
  coverPath: v.optional(v.string()),
  reelIds: v.array(v.id("reels")),
  services: v.array(v.string()),
  featured: v.boolean(),
  published: v.boolean(),
};

export const faqFields = {
  question: vText,
  answer: vText,
  scope: v.union(v.literal("services"), v.literal("careers")),
  published: v.boolean(),
};

export const testimonialFields = {
  quote: vText,
  author: v.string(),
  role: vText,
  clientId: v.optional(v.id("clients")),
  photo: v.optional(v.id("_storage")),
  photoPath: v.optional(v.string()),
  published: v.boolean(),
};

export const teamMemberFields = {
  name: vText,
  role: vText,
  bio: vText,
  photo: v.optional(v.id("_storage")),
  photoPath: v.optional(v.string()),
  instagram: v.optional(v.string()),
  published: v.boolean(),
};

export const jobFields = {
  slug: v.string(),
  title: vText,
  department: v.string(),
  type: v.string(),
  workplace: v.string(),
  location: vText,
  summary: vText,
  responsibilities: v.array(vText),
  requirements: v.array(vText),
  niceToHave: v.array(vText),
  perks: v.array(vText),
  salary: vText,
  questions: v.array(vQuestion),
  status: vJobStatus,
  featured: v.boolean(),
  closesAt: v.optional(v.number()),
};

/* ------------------------------------------------------------------ */
/* Site settings (single document)                                     */
/* ------------------------------------------------------------------ */

export const vGeneral = v.object({
  agencyName: v.string(),
  tagline: vText,
  footerNote: vText,
});

export const vHero = v.object({
  eyebrow: vText,
  line1: vText,
  line2: vText,
  sub: vText,
  showTimeline: v.boolean(),
});

export const vStat = v.object({ value: v.string(), label: vText });

export const vContact = v.object({
  phone: v.string(),
  whatsapp: v.string(),
  email: v.string(),
  address: vText,
  hours: vText,
  mapUrl: v.string(),
});

export const vSocial = v.object({
  instagram: v.string(),
  facebook: v.string(),
  tiktok: v.string(),
  youtube: v.string(),
  linkedin: v.string(),
  behance: v.string(),
});

export const vStep = v.object({ title: vText, body: vText });

export const vCareers = v.object({
  accepting: v.boolean(),
  intro: vText,
  perks: v.array(vStep),
  steps: v.array(vStep),
});

export const vSeo = v.object({
  title: vText,
  description: vText,
  ogImage: v.optional(v.id("_storage")),
});

export const vAnnouncement = v.object({
  enabled: v.boolean(),
  text: vText,
  href: v.string(),
});

/**
 * One card in "Formats that sell". `key` is a reel format (skit, pov…) for the
 * built-in cards, so a card with no picture can borrow a reel cover of that
 * format; cards added in the dashboard get a key of their own.
 */
export const vFormatCard = v.object({
  key: v.string(),
  image: v.optional(v.id("_storage")),
  name: vText,
  line: vText,
  best: vText,
  length: vText,
  hidden: v.boolean(),
});
export type FormatCardValue = Infer<typeof vFormatCard>;

export const settingsFields = {
  general: vGeneral,
  hero: vHero,
  stats: v.array(vStat),
  contact: vContact,
  social: vSocial,
  careers: vCareers,
  seo: vSeo,
  announcement: vAnnouncement,
  /** Optional so settings saved before the cards were editable stay valid; the defaults fill in. */
  formats: v.optional(v.array(vFormatCard)),
};

export type SettingsValue = {
  general: Infer<typeof vGeneral>;
  hero: Infer<typeof vHero>;
  stats: Infer<typeof vStat>[];
  contact: Infer<typeof vContact>;
  social: Infer<typeof vSocial>;
  careers: Infer<typeof vCareers>;
  seo: Infer<typeof vSeo>;
  announcement: Infer<typeof vAnnouncement>;
  formats: FormatCardValue[];
};
