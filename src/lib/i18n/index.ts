import type { Text } from "@convex/lib/validators";
import ar from "./ar";
import en, { type Dictionary } from "./en";

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const isLocale = (value: unknown): value is Locale => value === "en" || value === "ar";
export const dirOf = (locale: Locale) => (locale === "ar" ? "rtl" : "ltr");
export const dictionaryFor = (locale: Locale): Dictionary => (locale === "ar" ? ar : en);

/** Picks the right language from a bilingual field, falling back to the other one. */
export function tx(text: Text | null | undefined, locale: Locale): string {
  if (!text) return "";
  const primary = locale === "ar" ? text.ar : text.en;
  const secondary = locale === "ar" ? text.en : text.ar;
  return primary?.trim() ? primary : (secondary ?? "");
}

/** Fills `{name}` placeholders. */
export function fmt(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

export function localeHref(locale: Locale, path = "") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean === "/" ? "" : clean}`;
}

export type { Dictionary };
