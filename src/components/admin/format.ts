import type { Tone } from "./ui";

export const LEAD_STATUS = {
  new: { label: "New", tone: "accent" },
  contacted: { label: "Contacted", tone: "info" },
  proposal: { label: "Proposal sent", tone: "warn" },
  won: { label: "Won", tone: "ok" },
  lost: { label: "Lost", tone: "neutral" },
} as const satisfies Record<string, { label: string; tone: Tone }>;
export type LeadStatusKey = keyof typeof LEAD_STATUS;
export const LEAD_ORDER = Object.keys(LEAD_STATUS) as LeadStatusKey[];

export const APP_STAGE = {
  new: { label: "New", tone: "accent" },
  screening: { label: "Screening", tone: "info" },
  interview: { label: "Interview", tone: "warn" },
  offer: { label: "Offer", tone: "ok" },
  hired: { label: "Hired", tone: "ok" },
  rejected: { label: "Not moving forward", tone: "neutral" },
} as const satisfies Record<string, { label: string; tone: Tone }>;
export type AppStageKey = keyof typeof APP_STAGE;
export const STAGE_ORDER = Object.keys(APP_STAGE) as AppStageKey[];

export const SERVICE_LABEL: Record<string, string> = {
  content: "Content creation",
  production: "Media production",
  media_buying: "Media buying",
  full: "Full package",
};

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
export function relativeTime(ts: number, now = Date.now()) {
  const diff = ts - now;
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < minute) return "just now";
  if (abs < hour) return rtf.format(Math.round(diff / minute), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hour), "hour");
  if (abs < 7 * day) return rtf.format(Math.round(diff / day), "day");
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: abs > 300 * day ? "numeric" : undefined }).format(ts);
}

export function dateTime(ts: number) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(ts);
}

export function shortDate(ts: number) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(ts);
}

export function egp(n: number) {
  return `${new Intl.NumberFormat("en-EG").format(n)} EGP`;
}

/** Downloads rows as a UTF-8 CSV with BOM so Excel shows Arabic correctly. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function whatsappHref(phone: string, text?: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  const intl = digits.startsWith("0") ? `2${digits}` : digits;
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}
