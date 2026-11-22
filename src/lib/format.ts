import type { Locale } from "./i18n";

const tag = (locale: Locale) => (locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB");

export function formatNumber(n: number, locale: Locale) {
  return new Intl.NumberFormat(tag(locale)).format(n);
}

/**
 * 174K / 48.2K / 1.2M. Built by hand on purpose: Intl's compact notation differs
 * between Node and browsers ("48.2K" vs "48.2k"), which breaks hydration.
 */
export function formatCompact(n: number, _locale?: Locale) {
  const short = (value: number, suffix: string) => {
    const digits = value >= 100 ? 0 : 1;
    return `${value.toFixed(digits).replace(/\.0$/, "")}${suffix}`;
  };
  if (n >= 1_000_000) return short(n / 1_000_000, "M");
  if (n >= 1_000) return short(n / 1_000, "K");
  return String(Math.round(n));
}

/**
 * A headline number as typed in Site settings → Numbers. Plain numbers are
 * shortened and rounded down, so the claim never beats the real figure:
 * 18000000 → "18M+", 180000 → "180K+", 2500 → "2.5K+", 12 → "12".
 * Anything else ("12+", "3x", "98%") is shown as typed.
 */
export function statValue(raw: string): string {
  const typed = raw.trim();
  const western = typed.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (!/^\d[\d,.\s]*$/.test(western)) return typed;
  const n = Number(western.replace(/[,\s]/g, ""));
  if (!Number.isFinite(n)) return typed;
  return n >= 1_000 ? `${shortDown(n)}+` : shortDown(n);
}

/** 1.8M / 518K / 950, always rounded down: statValue, and the count-up on its way there. */
export function shortDown(n: number): string {
  const down = (value: number, suffix: string) => {
    const digits = value >= 100 ? 0 : 1;
    const f = 10 ** digits;
    return `${(Math.floor(value * f) / f).toFixed(digits).replace(/\.0$/, "")}${suffix}`;
  };
  if (n >= 1_000_000_000) return down(n / 1_000_000_000, "B");
  if (n >= 1_000_000) return down(n / 1_000_000, "M");
  if (n >= 1_000) return down(n / 1_000, "K");
  return String(Math.floor(n));
}

export function formatDate(ts: number, locale: Locale, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat(tag(locale), opts).format(new Date(ts));
}

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function whatsappLink(number: string, text?: string) {
  const digits = number.replace(/[^0-9]/g, "");
  const intl = digits.startsWith("0") ? `2${digits}` : digits; // Egyptian local numbers -> +20
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function platformOf(url: string | null) {
  if (!url) return "";
  if (url.includes("instagram")) return "Instagram";
  if (url.includes("tiktok")) return "TikTok";
  if (url.includes("facebook") || url.includes("fb.watch")) return "Facebook";
  if (url.includes("youtu")) return "YouTube";
  return "the web";
}
