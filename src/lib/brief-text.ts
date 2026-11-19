import type { BriefText } from "@/components/site/BriefFlow";
import type { Dictionary } from "./i18n";
import en from "./i18n/en";

/** Everything the project brief needs, with the English values the dashboard stores. */
export function briefText(d: Dictionary): BriefText {
  return {
    b: d.brief,
    c: d.contactPage,
    e: d.errors,
    values: {
      budgets: en.contactPage.budgets,
      industries: en.contactPage.industries,
      sources: en.contactPage.sources,
      goals: en.brief.goals,
    },
  };
}
