import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  caseStudyFields,
  clientFields,
  faqFields,
  jobFields,
  reelFields,
  serviceFields,
  settingsFields,
  teamMemberFields,
  testimonialFields,
  vAppStage,
  vLeadStatus,
  vRole,
} from "./lib/validators";

const ordered = { order: v.number() };

export default defineSchema({
  /* ---------------------------- Access ---------------------------- */
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: vRole,
    active: v.boolean(),
    passwordHash: v.string(),
    lastLoginAt: v.optional(v.number()),
    lastSeenLeadsAt: v.number(),
    lastSeenApplicationsAt: v.number(),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    userId: v.id("users"),
    tokenHash: v.string(),
    expiresAt: v.number(),
    userAgent: v.optional(v.string()),
  })
    .index("by_token", ["tokenHash"])
    .index("by_user", ["userId"])
    .index("by_expiry", ["expiresAt"]),

  invites: defineTable({
    email: v.string(),
    role: vRole,
    tokenHash: v.string(),
    invitedBy: v.id("users"),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_token", ["tokenHash"])
    .index("by_email", ["email"]),

  passwordResets: defineTable({
    userId: v.id("users"),
    tokenHash: v.string(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
  }).index("by_token", ["tokenHash"]),

  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_window", ["windowStart"]),

  /* ----------------------------- Inbox ----------------------------- */
  leads: defineTable({
    name: v.string(),
    company: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    city: v.optional(v.string()),
    link: v.optional(v.string()),
    services: v.array(v.string()),
    budget: v.optional(v.string()),
    industry: v.optional(v.string()),
    message: v.optional(v.string()),
    source: v.optional(v.string()),
    locale: v.string(),
    origin: v.union(v.literal("website"), v.literal("manual")),
    status: vLeadStatus,
    assigneeId: v.optional(v.id("users")),
    followUpAt: v.optional(v.number()),
    value: v.optional(v.number()),
    tags: v.array(v.string()),
    searchText: v.string(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_followUp", ["followUpAt"])
    .searchIndex("search", { searchField: "searchText", filterFields: ["status"] }),

  applications: defineTable({
    jobId: v.optional(v.id("jobs")),
    jobTitle: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    city: v.optional(v.string()),
    experience: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
    profileUrl: v.optional(v.string()),
    cv: v.optional(v.id("_storage")),
    cvName: v.optional(v.string()),
    cvType: v.optional(v.string()),
    cvSize: v.optional(v.number()),
    coverNote: v.optional(v.string()),
    expectedSalary: v.optional(v.string()),
    startDate: v.optional(v.string()),
    answers: v.array(v.object({ questionId: v.string(), label: v.string(), value: v.string() })),
    locale: v.string(),
    stage: vAppStage,
    rating: v.optional(v.number()),
    tags: v.array(v.string()),
    searchText: v.string(),
    updatedAt: v.number(),
  })
    .index("by_stage", ["stage"])
    .index("by_job", ["jobId"])
    .index("by_job_stage", ["jobId", "stage"])
    .index("by_cv", ["cv"])
    .index("by_email", ["email"])
    .searchIndex("search", { searchField: "searchText", filterFields: ["stage", "jobId"] }),

  notes: defineTable({
    entity: v.union(v.literal("lead"), v.literal("application")),
    entityId: v.string(),
    kind: v.union(v.literal("note"), v.literal("event")),
    body: v.string(),
    authorId: v.optional(v.id("users")),
    authorName: v.string(),
  }).index("by_entity", ["entity", "entityId"]),

  /* ---------------------------- Content ---------------------------- */
  clients: defineTable({ ...clientFields, ...ordered })
    .index("by_order", ["order"])
    .index("by_slug", ["slug"]),
  services: defineTable({ ...serviceFields, ...ordered }).index("by_order", ["order"]),
  reels: defineTable({ ...reelFields, ...ordered })
    .index("by_order", ["order"])
    .index("by_client", ["clientId"]),
  caseStudies: defineTable({ ...caseStudyFields, ...ordered })
    .index("by_order", ["order"])
    .index("by_slug", ["slug"]),
  faqs: defineTable({ ...faqFields, ...ordered }).index("by_order", ["order"]),
  testimonials: defineTable({ ...testimonialFields, ...ordered }).index("by_order", ["order"]),
  teamMembers: defineTable({ ...teamMemberFields, ...ordered }).index("by_order", ["order"]),
  jobs: defineTable({ ...jobFields, ...ordered, publishedAt: v.optional(v.number()) })
    .index("by_order", ["order"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status", "order"]),

  settings: defineTable({ key: v.literal("site"), ...settingsFields }).index("by_key", ["key"]),

  media: defineTable({
    storageId: v.id("_storage"),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
    kind: v.union(v.literal("image"), v.literal("video"), v.literal("file")),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    alt: v.optional(v.string()),
    uploadedBy: v.id("users"),
  })
    .index("by_storage", ["storageId"])
    .index("by_kind", ["kind"]),

  activity: defineTable({
    actorId: v.optional(v.id("users")),
    actorName: v.string(),
    action: v.string(),
    entity: v.string(),
    entityId: v.optional(v.string()),
    label: v.string(),
  }).index("by_entity", ["entity"]),
});
