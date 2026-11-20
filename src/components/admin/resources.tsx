"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@convex/_generated/api";
import { CheckCircle, LockSimple, NotePencil } from "@phosphor-icons/react";
import { formatCompact } from "@/lib/format";
import { emptyText } from "./fields";
import type { ResourceConfig } from "./resource";
import { errorMessage, useAdminMutation } from "./session";
import { Badge, MenuItem, useFeedback } from "./ui";

export const FORMAT_OPTIONS = [
  { value: "skit", label: "Skit" },
  { value: "pov", label: "POV" },
  { value: "storytelling", label: "Storytelling" },
  { value: "product", label: "Product" },
  { value: "voxpop", label: "Street interview" },
  { value: "ugc", label: "UGC" },
  { value: "bts", label: "Behind the scenes" },
  { value: "ad", label: "Ad" },
  { value: "motion", label: "Motion" },
];
export const DEPARTMENT_OPTIONS = [
  { value: "production", label: "Production" },
  { value: "content", label: "Content" },
  { value: "media_buying", label: "Media buying" },
  { value: "design", label: "Design" },
  { value: "accounts", label: "Accounts" },
  { value: "operations", label: "Operations" },
];
export const TYPE_OPTIONS = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
  { value: "talent", label: "Talent pool" },
];
export const WORKPLACE_OPTIONS = [
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];
/** Reel types: the Work page's two tabs. */
export const CATEGORY_OPTIONS = [
  { value: "content", label: "Content" },
  { value: "production", label: "Production" },
];
export const SERVICE_OPTIONS = [
  { value: "content", label: "Content creation" },
  { value: "production", label: "Media production" },
  { value: "media_buying", label: "Media buying" },
];
const label = (opts: { value: string; label: string }[], v: string) => opts.find((o) => o.value === v)?.label ?? v;
const compact = (n?: number) => (n ? formatCompact(n) : "");

/* ----------------------------- Clients ----------------------------- */

export const clientsConfig: ResourceConfig = {
  singular: "Client",
  plural: "Clients",
  description: "The roster on the homepage and work page. Drag to set the order — biggest names first usually reads best.",
  basePath: "/admin/clients",
  api: api.clients as any,
  publishToggle: true,
  thumb: (d) => ({ storageId: d.logo, path: d.logoPath }),
  titleOf: (d) => d.name?.en || d.name?.ar || "",
  subtitleOf: (d) => [d.industry?.en, d.city?.en].filter(Boolean).join(" · "),
  searchOf: (d) => `${d.name.en} ${d.name.ar} ${d.industry.en} ${d.city.en}`,
  columns: [
    {
      label: "Followers",
      className: "w-20 text-end",
      render: (d) => <span className="font-mono text-[0.8rem] tabular text-a-muted">{compact(d.followers)}</span>,
    },
    { label: "Homepage", className: "w-24", render: (d) => (d.featured ? <Badge tone="accent">Homepage</Badge> : null) },
  ],
  empty: () => ({
    name: emptyText(),
    slug: "",
    industry: emptyText(),
    city: emptyText(),
    logo: undefined,
    logoPath: undefined,
    followers: undefined,
    link: undefined,
    featured: true,
    published: true,
  }),
  sections: [
    {
      title: "Brand",
      fields: [
        { kind: "i18n", name: "name", label: "Name", required: true },
        { kind: "slug", name: "slug", label: "Slug", source: "name", prefix: "client/", hint: "Used internally to link reels and case studies." },
        { kind: "i18n", name: "industry", label: "Industry", hint: "e.g. Menswear, Home furnishings" },
        { kind: "i18n", name: "city", label: "City / reach", hint: "e.g. El-Mahalla el-Kubra, or “Ships nationwide”" },
      ],
    },
    {
      title: "Links & numbers",
      fields: [
        { kind: "text", name: "link", label: "Page link", optional: true, dir: "ltr", placeholder: "https://facebook.com/…", hint: "Visitors can open the brand's page from the roster." },
        { kind: "number", name: "followers", label: "Followers", optional: true, min: 0, hint: "Shown next to the brand and added to the audience total. Leave empty to hide." },
      ],
    },
    {
      title: "Logo",
      aside: true,
      fields: [{ kind: "image", name: "logo", pathName: "logoPath", label: "Logo", preset: "logo", hint: "Square works best. It's shown at 56px in the roster." }],
    },
    {
      title: "Visibility",
      aside: true,
      fields: [
        { kind: "switch", name: "published", label: "Show on website" },
        { kind: "switch", name: "featured", label: "Feature on homepage", description: "Off = only on the Work page." },
      ],
    },
  ],
};

/* ----------------------------- Services ---------------------------- */

export const servicesConfig: ResourceConfig = {
  singular: "Service",
  plural: "Services",
  description: "The Think / Shoot / Scale blocks. The last one in the list is highlighted in orange on the site.",
  basePath: "/admin/services",
  api: api.services as any,
  publishToggle: true,
  titleOf: (d) => d.title?.en || d.title?.ar || "",
  subtitleOf: (d) => `${d.verb?.en ?? ""} · ${d.deliverables?.length ?? 0} deliverables`,
  searchOf: (d) => `${d.title.en} ${d.title.ar} ${d.verb.en}`,
  empty: () => ({ verb: emptyText(), title: emptyText(), summary: emptyText(), deliverables: [], published: true }),
  sections: [
    {
      title: "Service",
      fields: [
        { kind: "i18n", name: "verb", label: "Verb", hint: "One word shown huge, e.g. Think / نفكّر" },
        { kind: "i18n", name: "title", label: "Service name", required: true },
        { kind: "i18n", name: "summary", label: "Description", multiline: true, rows: 4 },
      ],
    },
    { title: "Deliverables", fields: [{ kind: "i18nList", name: "deliverables", label: "What the client gets", addLabel: "Add deliverable" }] },
    { title: "Visibility", aside: true, fields: [{ kind: "switch", name: "published", label: "Show on website" }] },
  ],
};

/* ------------------------------ Reels ------------------------------ */

export const reelsConfig: ResourceConfig = {
  singular: "Reel",
  plural: "Reels",
  description: "Videos for the homepage and work page. Each reel links to its video (Cloudinary, YouTube, Instagram or TikTok) and has a cover image.",
  basePath: "/admin/work",
  api: api.reels as any,
  view: "grid",
  publishToggle: true,
  thumb: (d) => ({ storageId: d.poster, path: d.posterPath }),
  thumbAspect: "aspect-[9/16]",
  titleOf: (d) => d.title?.en || d.title?.ar || "",
  subtitleOf: (d) =>
    `${d.category ? `${label(CATEGORY_OPTIONS, d.category)} · ` : ""}${label(FORMAT_OPTIONS, d.format)}${d.video || d.videoUrl ? "" : " · no video yet"}`,
  searchOf: (d) => `${d.title.en} ${d.title.ar} ${d.format} ${d.category ?? ""}`,
  previewHref: (d) => (d.published ? "/en/work" : null),
  empty: () => ({
    title: emptyText(),
    clientId: undefined,
    format: "skit",
    category: undefined,
    video: undefined,
    videoUrl: undefined,
    videoPublicId: undefined,
    videoBytes: undefined,
    videoDuration: undefined,
    socialUrl: undefined,
    poster: undefined,
    posterPath: undefined,
    views: undefined,
    featured: true,
    published: true,
  }),
  sections: [
    {
      title: "Reel",
      fields: [
        { kind: "i18n", name: "title", label: "Title", required: true },
        {
          kind: "select",
          name: "category",
          label: "Type",
          options: CATEGORY_OPTIONS,
          optional: true,
          hint: "The Work page has a Content tab and a Production tab.",
        },
        { kind: "select", name: "format", label: "Format", options: FORMAT_OPTIONS },
        { kind: "reference", name: "clientId", label: "Client", source: "clients" },
        { kind: "number", name: "views", label: "Views", optional: true, min: 0, hint: "Optional. Shown on the card, e.g. 120K views." },
      ],
    },
    {
      title: "Video",
      description: "Upload the reel (it's shrunk and stored on Cloudinary) or paste a YouTube or Instagram link.",
      fields: [
        { kind: "video", name: "video", label: "Video file" },
        { kind: "reelVideo", name: "videoUrl", label: "Video" },
        { kind: "text", name: "socialUrl", label: "Post link", optional: true, dir: "ltr", placeholder: "https://instagram.com/reel/…", hint: "Shown as “Watch on Instagram”." },
      ],
    },
    {
      title: "Cover",
      aside: true,
      fields: [{ kind: "image", name: "poster", pathName: "posterPath", label: "Cover frame", aspect: "aspect-[9/16]", preset: "poster", hint: "A vertical still from the reel, shown before it plays. Uploading a video makes one from its first second when this is empty." }],
    },
    {
      title: "Visibility",
      aside: true,
      fields: [
        { kind: "switch", name: "published", label: "Show on website" },
        { kind: "switch", name: "featured", label: "Feature on homepage", description: "Homepage shows up to 7 featured reels." },
      ],
    },
  ],
};

/* --------------------------- Case studies -------------------------- */

export const caseStudiesConfig: ResourceConfig = {
  singular: "Case study",
  plural: "Case studies",
  description: "Before/after stories. The Results section appears on the site as soon as one is published.",
  basePath: "/admin/case-studies",
  api: api.caseStudies as any,
  publishToggle: true,
  thumb: (d) => ({ storageId: d.cover, path: d.coverPath }),
  thumbAspect: "aspect-[4/3]",
  titleOf: (d) => d.title?.en || d.title?.ar || "",
  subtitleOf: (d) => `${d.metrics?.length ?? 0} metrics · ${d.reelIds?.length ?? 0} reels`,
  searchOf: (d) => `${d.title.en} ${d.title.ar} ${d.slug}`,
  previewHref: (d) => (d.published ? `/en/work/${d.slug}` : null),
  empty: () => ({
    slug: "",
    clientId: undefined,
    title: emptyText(),
    summary: emptyText(),
    challenge: emptyText(),
    approach: emptyText(),
    outcome: emptyText(),
    metrics: [],
    cover: undefined,
    coverPath: undefined,
    reelIds: [],
    services: [],
    featured: true,
    published: false,
  }),
  sections: [
    {
      title: "Story",
      fields: [
        { kind: "i18n", name: "title", label: "Title", required: true },
        { kind: "slug", name: "slug", label: "URL", source: "title", prefix: "/work/" },
        { kind: "reference", name: "clientId", label: "Client", source: "clients" },
        { kind: "i18n", name: "summary", label: "Summary", multiline: true, rows: 3 },
        { kind: "i18n", name: "challenge", label: "The brief", multiline: true, rows: 4 },
        { kind: "i18n", name: "approach", label: "What we did", multiline: true, rows: 4 },
        { kind: "i18n", name: "outcome", label: "What changed", multiline: true, rows: 4 },
      ],
    },
    { title: "Numbers", fields: [{ kind: "metrics", name: "metrics", label: "Metrics", hint: "Real numbers only. Two show on cards; all show on the page." }] },
    { title: "Reels", fields: [{ kind: "references", name: "reelIds", label: "Reels from this project", source: "reels" }] },
    { title: "Cover", aside: true, fields: [{ kind: "image", name: "cover", pathName: "coverPath", label: "Cover image", aspect: "aspect-[4/3]", preset: "cover" }] },
    {
      title: "Details",
      aside: true,
      fields: [
        { kind: "multiselect", name: "services", label: "Services used", options: SERVICE_OPTIONS },
        { kind: "switch", name: "published", label: "Published" },
        { kind: "switch", name: "featured", label: "Feature on homepage" },
      ],
    },
  ],
};

/* ------------------------------- FAQs ------------------------------ */

export const faqsConfig: ResourceConfig = {
  singular: "FAQ",
  plural: "FAQs",
  description: "Questions on the Services page (for clients) and the Careers page (for applicants).",
  basePath: "/admin/faqs",
  api: api.faqs as any,
  publishToggle: true,
  titleOf: (d) => d.question?.en || d.question?.ar || "",
  subtitleOf: (d) => (d.scope === "careers" ? "Careers page" : "Services page"),
  searchOf: (d) => `${d.question.en} ${d.question.ar} ${d.answer.en}`,
  columns: [{ label: "Page", className: "w-28", render: (d) => <Badge tone={d.scope === "careers" ? "info" : "accent"}>{d.scope === "careers" ? "Careers" : "Services"}</Badge> }],
  empty: () => ({ question: emptyText(), answer: emptyText(), scope: "services", published: true }),
  sections: [
    {
      title: "Question",
      fields: [
        { kind: "i18n", name: "question", label: "Question", required: true },
        { kind: "i18n", name: "answer", label: "Answer", multiline: true, rows: 5, required: true },
      ],
    },
    {
      title: "Placement",
      aside: true,
      fields: [
        { kind: "select", name: "scope", label: "Show on", options: [{ value: "services", label: "Services page" }, { value: "careers", label: "Careers page" }] },
        { kind: "switch", name: "published", label: "Show on website" },
      ],
    },
  ],
};

/* --------------------------- Testimonials -------------------------- */

export const testimonialsConfig: ResourceConfig = {
  singular: "Testimonial",
  plural: "Testimonials",
  description: "Quotes from clients. The section appears on the homepage once one is published. Use real quotes with permission.",
  basePath: "/admin/testimonials",
  api: api.testimonials as any,
  publishToggle: true,
  thumb: (d) => ({ storageId: d.photo, path: d.photoPath }),
  titleOf: (d) => d.author || "",
  subtitleOf: (d) => d.quote?.en?.slice(0, 80) || d.quote?.ar?.slice(0, 80),
  searchOf: (d) => `${d.author} ${d.quote.en} ${d.quote.ar}`,
  empty: () => ({ quote: emptyText(), author: "", role: emptyText(), clientId: undefined, photo: undefined, photoPath: undefined, published: true }),
  sections: [
    {
      title: "Quote",
      fields: [
        { kind: "i18n", name: "quote", label: "Quote", multiline: true, rows: 4, required: true },
        { kind: "text", name: "author", label: "Name", required: true },
        { kind: "i18n", name: "role", label: "Role", hint: "e.g. Owner, Marketing manager" },
        { kind: "reference", name: "clientId", label: "Company", source: "clients" },
      ],
    },
    { title: "Photo", aside: true, fields: [{ kind: "image", name: "photo", pathName: "photoPath", label: "Photo", preset: "avatar" }] },
    { title: "Visibility", aside: true, fields: [{ kind: "switch", name: "published", label: "Show on website" }] },
  ],
};

/* --------------------------- Team members -------------------------- */

export const teamConfig: ResourceConfig = {
  singular: "Team member",
  plural: "Team on site",
  description: "People shown on the Careers page under “Who you'll work with”. This is separate from dashboard access.",
  basePath: "/admin/team",
  api: api.teamMembers as any,
  publishToggle: true,
  thumb: (d) => ({ storageId: d.photo, path: d.photoPath }),
  thumbAspect: "aspect-[4/5]",
  titleOf: (d) => d.name?.en || d.name?.ar || "",
  subtitleOf: (d) => d.role?.en,
  searchOf: (d) => `${d.name.en} ${d.name.ar} ${d.role.en}`,
  empty: () => ({ name: emptyText(), role: emptyText(), bio: emptyText(), photo: undefined, photoPath: undefined, instagram: undefined, published: true }),
  sections: [
    {
      title: "Person",
      fields: [
        { kind: "i18n", name: "name", label: "Name", required: true },
        { kind: "i18n", name: "role", label: "Role" },
        { kind: "i18n", name: "bio", label: "Short bio", multiline: true, rows: 3 },
        { kind: "text", name: "instagram", label: "Instagram", optional: true, dir: "ltr", placeholder: "https://instagram.com/…" },
      ],
    },
    { title: "Photo", aside: true, fields: [{ kind: "image", name: "photo", pathName: "photoPath", label: "Portrait", aspect: "aspect-[4/5]", preset: "photo" }] },
    { title: "Visibility", aside: true, fields: [{ kind: "switch", name: "published", label: "Show on website" }] },
  ],
};

/* ------------------------------- Jobs ------------------------------ */

const STATUS_TONE = { open: "ok", draft: "neutral", closed: "danger" } as const;

function JobStatusItems({ doc }: { doc: any }) {
  const setStatus = useAdminMutation(api.jobs.setStatus, { refresh: true });
  const { toast } = useFeedback();
  const run = (status: "open" | "closed" | "draft") =>
    setStatus({ id: doc._id, status })
      .then(() => toast(status === "open" ? "Role is open — it's live on the careers page" : status === "closed" ? "Role closed" : "Moved to drafts"))
      .catch((e) => toast(errorMessage(e), "error"));
  return (
    <>
      {doc.status !== "open" ? (
        <MenuItem icon={<CheckCircle className="size-4" aria-hidden />} onSelect={() => run("open")}>
          Open role
        </MenuItem>
      ) : null}
      {doc.status === "open" ? (
        <MenuItem icon={<LockSimple className="size-4" aria-hidden />} onSelect={() => run("closed")}>
          Close role
        </MenuItem>
      ) : null}
      {doc.status !== "draft" ? (
        <MenuItem icon={<NotePencil className="size-4" aria-hidden />} onSelect={() => run("draft")}>
          Move to drafts
        </MenuItem>
      ) : null}
    </>
  );
}

export const jobsConfig: ResourceConfig = {
  singular: "Job",
  plural: "Jobs",
  description: "Roles on the careers page. Open roles accept applications; closed ones stay visible with a note.",
  basePath: "/admin/jobs",
  api: api.jobs as any,
  titleOf: (d) => d.title?.en || d.title?.ar || "",
  subtitleOf: (d) => [label(DEPARTMENT_OPTIONS, d.department), label(TYPE_OPTIONS, d.type), label(WORKPLACE_OPTIONS, d.workplace)].join(" · "),
  searchOf: (d) => `${d.title.en} ${d.title.ar} ${d.department} ${d.type}`,
  previewHref: (d) => (d.status !== "draft" ? `/en/careers/${d.slug}` : null),
  columns: [
    {
      label: "Applications",
      className: "w-32 text-end",
      render: (d) =>
        d.applications !== undefined ? (
          <a href={`/admin/applications?job=${d._id}`} className="text-[0.8rem] text-a-muted hover:text-a-text hover:underline">
            <span className="font-mono tabular text-a-text">{d.applications}</span> applied
            {d.newApplications ? <span className="ms-1 font-semibold text-signal-600">· {d.newApplications} new</span> : null}
          </a>
        ) : null,
    },
    {
      label: "Status",
      className: "w-20",
      render: (d) => (
        <Badge tone={STATUS_TONE[d.status as keyof typeof STATUS_TONE]} dot>
          {d.status === "open" ? "Open" : d.status === "closed" ? "Closed" : "Draft"}
        </Badge>
      ),
    },
  ],
  rowMenu: (doc) => <JobStatusItems doc={doc} />,
  empty: () => ({
    slug: "",
    title: emptyText(),
    department: "production",
    type: "full_time",
    workplace: "onsite",
    location: { en: "Egypt", ar: "مصر" },
    summary: emptyText(),
    responsibilities: [emptyText()],
    requirements: [emptyText()],
    niceToHave: [],
    perks: [],
    salary: emptyText(),
    questions: [],
    status: "draft",
    featured: false,
    closesAt: undefined,
  }),
  sections: [
    {
      title: "Role",
      fields: [
        { kind: "i18n", name: "title", label: "Job title", required: true },
        { kind: "slug", name: "slug", label: "URL", source: "title", prefix: "/careers/" },
        { kind: "i18n", name: "summary", label: "Summary", multiline: true, rows: 3, hint: "Two sentences: what the job is and why it matters." },
      ],
    },
    {
      title: "Details",
      fields: [
        { kind: "i18nList", name: "responsibilities", label: "What you'll do", addLabel: "Add responsibility" },
        { kind: "i18nList", name: "requirements", label: "What we're looking for", addLabel: "Add requirement" },
        { kind: "i18nList", name: "niceToHave", label: "Nice to have", addLabel: "Add item" },
        { kind: "i18nList", name: "perks", label: "What you get", addLabel: "Add perk" },
      ],
    },
    {
      title: "Application questions",
      description: "Extra questions on top of name, contact, portfolio and CV.",
      fields: [{ kind: "questions", name: "questions", label: "Questions" }],
    },
    {
      title: "Publishing",
      aside: true,
      fields: [
        {
          kind: "select",
          name: "status",
          label: "Status",
          options: [
            { value: "draft", label: "Draft — not on the site" },
            { value: "open", label: "Open — accepting applications" },
            { value: "closed", label: "Closed — visible, no applications" },
          ],
        },
        { kind: "switch", name: "featured", label: "Feature on homepage", description: "Featured roles are listed first." },
        { kind: "date", name: "closesAt", label: "Closing date", hint: "Optional. Shown on the role page." },
      ],
    },
    {
      title: "Classification",
      aside: true,
      fields: [
        { kind: "select", name: "department", label: "Team", options: DEPARTMENT_OPTIONS },
        { kind: "select", name: "type", label: "Type", options: TYPE_OPTIONS },
        { kind: "select", name: "workplace", label: "Workplace", options: WORKPLACE_OPTIONS },
        { kind: "i18n", name: "location", label: "Location" },
        { kind: "i18n", name: "salary", label: "Pay", hint: "e.g. Competitive, or a range" },
      ],
    },
  ],
};
