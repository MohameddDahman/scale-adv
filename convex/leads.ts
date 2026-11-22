import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { addEvent, logActivity } from "./lib/activity";
import { requireUser } from "./lib/auth";
import { clean, fail, isEmail, normalizePhone, normalizeUrl, requireText } from "./lib/util";
import { LEAD_STATUSES, vLeadStatus, type LeadStatus } from "./lib/validators";

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  proposal: "Proposal sent",
  won: "Won",
  lost: "Lost",
};

const searchTextOf = (l: Pick<Doc<"leads">, "name" | "company" | "phone" | "email" | "message" | "tags">) =>
  [l.name, l.company, l.phone, l.email, l.message, ...l.tags].filter(Boolean).join(" ");

export const list = query({
  args: {
    token: v.string(),
    status: v.optional(vLeadStatus),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, "leads");
    const term = a.search?.trim();
    if (term) {
      return await ctx.db
        .query("leads")
        .withSearchIndex("search", (q) => {
          const s = q.search("searchText", term);
          return a.status ? s.eq("status", a.status) : s;
        })
        .paginate(a.paginationOpts);
    }
    if (a.status) {
      const status = a.status;
      return await ctx.db
        .query("leads")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .paginate(a.paginationOpts);
    }
    return await ctx.db.query("leads").order("desc").paginate(a.paginationOpts);
  },
});

export const board = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token, "leads");
    const columns: Record<string, Doc<"leads">[]> = {};
    for (const status of LEAD_STATUSES) {
      columns[status] = await ctx.db
        .query("leads")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(80);
    }
    return columns as Record<LeadStatus, Doc<"leads">[]>;
  },
});

export const counts = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token, "leads");
    const out: Record<string, number> = { all: 0 };
    for (const status of LEAD_STATUSES) {
      const rows = await ctx.db
        .query("leads")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
      out[status] = rows.length;
      out.all += rows.length;
    }
    return out as Record<LeadStatus | "all", number>;
  },
});

export const get = query({
  args: { token: v.string(), id: v.id("leads") },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, "leads");
    const lead = await ctx.db.get("leads", a.id);
    if (!lead) return null;
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_entity", (q) => q.eq("entity", "lead").eq("entityId", a.id))
      .collect();
    return { lead, notes };
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("leads"),
    status: v.optional(vLeadStatus),
    assigneeId: v.optional(v.union(v.id("users"), v.null())),
    followUpAt: v.optional(v.union(v.number(), v.null())),
    value: v.optional(v.union(v.number(), v.null())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, "leads");
    const lead = await ctx.db.get("leads", a.id);
    if (!lead) fail("This lead no longer exists.");
    const patch: Partial<Doc<"leads">> = { updatedAt: Date.now() };
    if (a.status && a.status !== lead.status) {
      patch.status = a.status;
      await addEvent(ctx, "lead", a.id, user, `Moved from ${STATUS_LABEL[lead.status]} to ${STATUS_LABEL[a.status]}`);
      await logActivity(ctx, user, `moved to ${STATUS_LABEL[a.status]}`, "lead", `${lead.name} — ${lead.company}`, a.id);
    }
    if (a.assigneeId !== undefined) {
      patch.assigneeId = a.assigneeId ?? undefined;
      const assignee = a.assigneeId ? await ctx.db.get("users", a.assigneeId) : null;
      await addEvent(ctx, "lead", a.id, user, assignee ? `Assigned to ${assignee.name}` : "Unassigned");
    }
    if (a.followUpAt !== undefined) {
      patch.followUpAt = a.followUpAt ?? undefined;
      if (a.followUpAt) {
        await addEvent(ctx, "lead", a.id, user, `Follow-up set for ${new Date(a.followUpAt).toISOString().slice(0, 10)}`);
      }
    }
    if (a.value !== undefined) patch.value = a.value ?? undefined;
    if (a.tags) {
      patch.tags = [...new Set(a.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
      patch.searchText = searchTextOf({ ...lead, tags: patch.tags });
    }
    await ctx.db.patch("leads", a.id, patch);
  },
});

export const updateMany = mutation({
  args: { token: v.string(), ids: v.array(v.id("leads")), status: vLeadStatus },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, "leads");
    for (const id of a.ids) {
      const lead = await ctx.db.get("leads", id);
      if (!lead || lead.status === a.status) continue;
      await ctx.db.patch("leads", id, { status: a.status, updatedAt: Date.now() });
      await addEvent(ctx, "lead", id, user, `Moved from ${STATUS_LABEL[lead.status]} to ${STATUS_LABEL[a.status]}`);
    }
    await logActivity(ctx, user, `moved ${a.ids.length} to ${STATUS_LABEL[a.status]}`, "lead", "Bulk update");
  },
});

export const create = mutation({
  args: {
    token: v.string(),
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
  },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, "leads");
    const name = requireText(a.name, "Name", 80, "name");
    const company = requireText(a.company, "Business name", 120, "company");
    const phone = normalizePhone(a.phone);
    if (!phone) fail("Enter a valid phone number.", "phone");
    const email = clean(a.email, 160)?.toLowerCase();
    if (email && !isEmail(email)) fail("Enter a valid email address.", "email");
    const message = clean(a.message, 3000);
    const id = await ctx.db.insert("leads", {
      name,
      company,
      phone,
      email,
      city: clean(a.city, 80),
      link: normalizeUrl(a.link),
      services: a.services,
      budget: clean(a.budget, 40),
      industry: clean(a.industry, 60),
      message,
      source: clean(a.source, 60) ?? "Added manually",
      locale: "en",
      origin: "manual",
      status: "new",
      assigneeId: user._id,
      tags: [],
      searchText: [name, company, phone, email, message].filter(Boolean).join(" "),
      updatedAt: Date.now(),
    });
    await addEvent(ctx, "lead", id, user, "Added manually");
    await logActivity(ctx, user, "added", "lead", `${name} — ${company}`, id);
    return id;
  },
});

export const remove = mutation({
  args: { token: v.string(), ids: v.array(v.id("leads")) },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, "leads");
    for (const id of a.ids) {
      const lead = await ctx.db.get("leads", id);
      if (!lead) continue;
      const notes = await ctx.db
        .query("notes")
        .withIndex("by_entity", (q) => q.eq("entity", "lead").eq("entityId", id))
        .collect();
      for (const n of notes) await ctx.db.delete("notes", n._id);
      await ctx.db.delete("leads", id);
    }
    await logActivity(ctx, user, "deleted", "lead", `${a.ids.length} lead${a.ids.length === 1 ? "" : "s"}`);
  },
});

export const exportAll = query({
  args: { token: v.string(), status: v.optional(vLeadStatus) },
  handler: async (ctx, a) => {
    await requireUser(ctx, a.token, "leads");
    const rows = a.status
      ? await ctx.db
          .query("leads")
          .withIndex("by_status", (q) => q.eq("status", a.status!))
          .order("desc")
          .collect()
      : await ctx.db.query("leads").order("desc").collect();
    const users = new Map((await ctx.db.query("users").collect()).map((u) => [u._id, u.name]));
    return rows.map((l) => ({
      received: new Date(l._creationTime).toISOString(),
      status: STATUS_LABEL[l.status],
      name: l.name,
      business: l.company,
      phone: l.phone,
      whatsapp: l.whatsapp ?? "",
      socials: (l.socials ?? []).join(" "),
      email: l.email ?? "",
      city: l.city ?? "",
      services: l.services.join(" | "),
      budget: l.budget ?? "",
      industry: l.industry ?? "",
      link: l.link ?? "",
      source: l.source ?? "",
      message: l.message ?? "",
      assignee: l.assigneeId ? (users.get(l.assigneeId) ?? "") : "",
      value_egp: l.value ?? "",
      follow_up: l.followUpAt ? new Date(l.followUpAt).toISOString().slice(0, 10) : "",
      tags: l.tags.join(" | "),
    }));
  },
});
