/**
 * Public form submissions: project briefs (leads) and job applications.
 * Errors carry a `code` and optional `field` so the website can show a
 * translated message next to the right input.
 */
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation } from "./_generated/server";
import { logActivity } from "./lib/activity";
import { hitLimit } from "./lib/rateLimit";
import { CV_TYPES, MAX_CV_BYTES } from "./lib/storage";
import { clean, fail, isEmail, isUrl, normalizePhone, normalizeSocials, normalizeUrl, requireText } from "./lib/util";
import { vLeadPriority } from "./lib/validators";
import { loadSettings } from "./site";

const LEAD_SERVICES = ["content", "production", "media_buying", "full"];
const HOUR = 60 * 60 * 1000;

function limited(): never {
  throw new ConvexError({
    code: "RATE_LIMITED",
    message: "Too many submissions. Wait a little and try again.",
  });
}

const reference = (prefix: string, id: string) => `${prefix}-${id.slice(-6).toUpperCase()}`;
const looksLikeBot = (honeypot?: string, elapsedMs?: number) =>
  !!honeypot || (elapsedMs !== undefined && elapsedMs < 2500);

/**
 * "Become our client": the short form asks what matters most (quality or
 * speed), then for a name, phone, WhatsApp and social links. Business name,
 * services and the rest are optional, so older pages can still send them.
 */
export const submitLead = mutation({
  args: {
    priority: v.optional(vLeadPriority),
    name: v.string(),
    company: v.optional(v.string()),
    phone: v.string(),
    whatsapp: v.optional(v.string()),
    socials: v.optional(v.array(v.string())),
    email: v.optional(v.string()),
    city: v.optional(v.string()),
    link: v.optional(v.string()),
    services: v.optional(v.array(v.string())),
    budget: v.optional(v.string()),
    industry: v.optional(v.string()),
    message: v.optional(v.string()),
    source: v.optional(v.string()),
    locale: v.string(),
    honeypot: v.optional(v.string()),
    elapsedMs: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    if (looksLikeBot(a.honeypot, a.elapsedMs)) return { ref: "L-000000" };

    const name = requireText(a.name, "Your name", 80, "name");
    const company = clean(a.company, 120) ?? "";
    const phone = normalizePhone(a.phone);
    if (!phone) fail("Enter a valid phone number.", "phone");
    const whatsapp = a.whatsapp?.trim() ? normalizePhone(a.whatsapp) : phone;
    if (!whatsapp) fail("Enter a valid WhatsApp number.", "whatsapp");
    const socials = normalizeSocials(a.socials);
    const email = clean(a.email, 160)?.toLowerCase();
    if (email && !isEmail(email)) fail("Enter a valid email address.", "email");
    const services = [...new Set((a.services ?? []).filter((s) => LEAD_SERVICES.includes(s)))];

    if (!(await hitLimit(ctx, `lead:${phone}`, 3, HOUR))) limited();
    if (!(await hitLimit(ctx, "lead:global", 120, HOUR))) limited();

    const message = clean(a.message, 3000);
    const now = Date.now();
    const id = await ctx.db.insert("leads", {
      name,
      company,
      phone,
      whatsapp,
      socials: socials.length ? socials : undefined,
      priority: a.priority,
      email,
      city: clean(a.city, 80),
      link: normalizeUrl(a.link),
      services,
      budget: clean(a.budget, 40),
      industry: clean(a.industry, 60),
      message,
      source: clean(a.source, 60),
      locale: a.locale === "ar" ? "ar" : "en",
      origin: "website",
      status: "new",
      tags: [],
      searchText: [name, company, phone, whatsapp !== phone ? whatsapp : "", email, message].filter(Boolean).join(" "),
      updatedAt: now,
    });
    await logActivity(ctx, null, "received", "lead", company ? `${name} — ${company}` : name, id);
    return { ref: reference("L", id) };
  },
});

/**
 * Rate limit for CV uploads (see convex/http.ts): a few per visitor, and a
 * ceiling for the whole site, so a flood of uploads can't fill storage.
 */
export const claimUploadSlot = internalMutation({
  args: { ip: v.optional(v.string()) },
  handler: async (ctx, { ip }) => {
    if (ip && !(await hitLimit(ctx, `upload:ip:${ip.slice(0, 64)}`, 6, HOUR))) return false;
    return await hitLimit(ctx, "upload:public", 60, HOUR);
  },
});

export const submitApplication = mutation({
  args: {
    jobSlug: v.optional(v.string()),
    name: v.string(),
    /** No longer asked for; kept so older pages still submit. */
    email: v.optional(v.string()),
    phone: v.string(),
    city: v.optional(v.string()),
    experience: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
    profileUrl: v.optional(v.string()),
    socials: v.optional(v.array(v.string())),
    cv: v.optional(v.id("_storage")),
    cvName: v.optional(v.string()),
    coverNote: v.optional(v.string()),
    expectedSalary: v.optional(v.string()),
    startDate: v.optional(v.string()),
    answers: v.array(v.object({ questionId: v.string(), value: v.string() })),
    locale: v.string(),
    consent: v.boolean(),
    honeypot: v.optional(v.string()),
    elapsedMs: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    if (looksLikeBot(a.honeypot, a.elapsedMs)) return { ref: "A-000000" };

    const settings = await loadSettings(ctx);
    const job = a.jobSlug
      ? await ctx.db
          .query("jobs")
          .withIndex("by_slug", (q) => q.eq("slug", a.jobSlug!))
          .first()
      : null;
    if (a.jobSlug && (!job || job.status !== "open")) {
      throw new ConvexError({ code: "CLOSED", message: "This role is no longer accepting applications." });
    }
    if (!job && !settings.careers.accepting) {
      throw new ConvexError({ code: "CLOSED", message: "We're not accepting open applications right now." });
    }

    const name = requireText(a.name, "Your name", 80, "name");
    const email = clean(a.email, 160)?.toLowerCase();
    if (email && !isEmail(email)) fail("Enter a valid email address.", "email");
    const phone = normalizePhone(a.phone);
    if (!phone) fail("Enter a valid phone number.", "phone");
    if (!a.consent) fail("Please confirm we can store your application.", "consent");
    const socials = normalizeSocials(a.socials);

    const portfolioUrl = normalizeUrl(a.portfolioUrl);
    if (a.portfolioUrl?.trim() && !portfolioUrl) fail("Enter a valid link, starting with https://", "portfolioUrl");
    const profileUrl = normalizeUrl(a.profileUrl);

    let cvType: string | undefined;
    let cvSize: number | undefined;
    if (a.cv) {
      const meta = await ctx.db.system.get("_storage", a.cv);
      if (!meta) fail("Your file didn't upload. Attach it again.", "cv");
      if (meta.size > MAX_CV_BYTES) fail("The file is larger than 5 MB.", "cv");
      if (meta.contentType && !CV_TYPES.includes(meta.contentType)) {
        fail("Upload a PDF, Word document or image.", "cv");
      }
      const taken = await ctx.db
        .query("applications")
        .withIndex("by_cv", (q) => q.eq("cv", a.cv))
        .first();
      if (taken) fail("Attach your file again.", "cv");
      cvType = meta.contentType;
      cvSize = meta.size;
    }
    const isTalent = job?.type === "talent";
    if (!isTalent && !a.cv && !portfolioUrl) {
      fail("Attach a CV or add a link to your work.", "cv");
    }

    const answers: { questionId: string; label: string; value: string }[] = [];
    for (const q of job?.questions ?? []) {
      const raw = a.answers.find((x) => x.questionId === q.id)?.value ?? "";
      const value = clean(raw, q.kind === "long" ? 2000 : 400) ?? "";
      if (q.required && !value) fail("This question needs an answer.", `q:${q.id}`);
      if (value && q.kind === "url" && !isUrl(normalizeUrl(value) ?? "")) {
        fail("Enter a valid link, starting with https://", `q:${q.id}`);
      }
      if (value) answers.push({ questionId: q.id, label: q.label.en || q.label.ar, value });
    }

    if (!(await hitLimit(ctx, `apply:${phone}`, 5, 24 * HOUR))) limited();
    if (!(await hitLimit(ctx, "apply:global", 200, HOUR))) limited();

    const coverNote = clean(a.coverNote, 3000);
    const jobTitle = job ? job.title.en || job.title.ar : "Open application";
    const now = Date.now();
    const id: Id<"applications"> = await ctx.db.insert("applications", {
      jobId: job?._id,
      jobTitle,
      name,
      email,
      phone,
      city: clean(a.city, 80),
      experience: clean(a.experience, 40),
      portfolioUrl,
      profileUrl,
      socials: socials.length ? socials : undefined,
      cv: a.cv,
      cvName: clean(a.cvName, 160),
      cvType,
      cvSize,
      coverNote,
      expectedSalary: clean(a.expectedSalary, 60),
      startDate: clean(a.startDate, 40),
      answers,
      locale: a.locale === "ar" ? "ar" : "en",
      stage: "new",
      tags: [],
      searchText: [name, email, phone, jobTitle, a.city].filter(Boolean).join(" "),
      updatedAt: now,
    });
    await logActivity(ctx, null, "received", "application", `${name} — ${jobTitle}`, id);
    return { ref: reference("A", id) };
  },
});
