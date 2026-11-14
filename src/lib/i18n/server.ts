import { locale as localeParam } from "next/root-params";
import { dictionaryFor, isLocale, type Locale } from ".";

export async function getLocale(): Promise<Locale> {
  const value = await localeParam();
  return isLocale(value) ? value : "en";
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, d: dictionaryFor(locale) };
}
