import type { BriefText } from "@/components/site/BriefFlow";
import type { Dictionary } from "./i18n";

/** Everything the "Become our client" sheet needs. */
export function briefText(d: Dictionary): BriefText {
  return { b: d.brief, e: d.errors };
}
