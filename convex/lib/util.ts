import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export function fail(message: string, field?: string): never {
  throw new ConvexError({ code: "INVALID", message, field });
}

export function clean(value: string | undefined | null, max = 500): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim().replace(/\s+\n/g, "\n");
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

export function requireText(value: string | undefined, label: string, max = 200, field?: string): string {
  const v = clean(value, max);
  if (!v) fail(`${label} is required.`, field);
  return v;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function isEmail(value: string) {
  return EMAIL_RE.test(value);
}

/** Accepts Egyptian and international numbers; keeps digits and a leading plus. */
export function normalizePhone(value: string): string | null {
  const raw = value.trim();
  const plus = raw.startsWith("+") || raw.startsWith("00");
  const digits = raw.replace(/[^0-9٠-٩]/g, "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const core = raw.startsWith("00") ? digits.slice(2) : digits;
  if (core.length < 8 || core.length > 15) return null;
  return plus ? `+${core}` : core;
}

export function isUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeUrl(value: string | undefined): string | undefined {
  const v = clean(value, 400);
  if (!v) return undefined;
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  return isUrl(withProto) ? withProto : undefined;
}

/** Social profile links from a form: each one checked, no repeats, six at most. */
export function normalizeSocials(values: string[] | undefined): string[] {
  const out: string[] = [];
  for (const raw of values ?? []) {
    const url = normalizeUrl(raw);
    if (url && new URL(url).hostname.includes(".") && !out.includes(url)) out.push(url.slice(0, 300));
    if (out.length >= 6) break;
  }
  return out;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const RESERVED_SLUGS = new Set(["apply", "new", "admin", "api"]);

export function assertSlug(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fail("Use lowercase letters, numbers and dashes for the URL slug.", "slug");
  }
  if (RESERVED_SLUGS.has(slug)) fail(`"${slug}" is reserved. Pick another slug.`, "slug");
}

export async function storageUrl(
  ctx: QueryCtx | MutationCtx,
  id: Id<"_storage"> | undefined,
  fallback?: string,
): Promise<string | null> {
  if (id) {
    const url = await ctx.storage.getUrl(id);
    if (url) return url;
  }
  return fallback ?? null;
}

export function byOrder<T extends { order: number }>(a: T, b: T) {
  return a.order - b.order;
}

export function displayName(user: Doc<"users"> | null | undefined) {
  return user?.name || user?.username || "System";
}

export const DAY = 24 * 60 * 60 * 1000;
