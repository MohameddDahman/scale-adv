import type { Metadata } from "next";
import { ApplyPanel } from "@/components/site/Apply";
import { getLayoutData } from "@/lib/content";
import { localeHref } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, d } = await getDictionary();
  return {
    title: d.applyDialog.title,
    description: d.applyDialog.sub,
    alternates: { canonical: `/${locale}/apply`, languages: { en: "/en/apply", ar: "/ar/apply" } },
  };
}

/**
 * The link to share with people who want to join (scaleadv.org/apply): pick a
 * role, fill in the form. /apply?role=<job slug> opens with that role picked.
 */
export default async function ApplyPage() {
  const { locale, d } = await getDictionary();
  const data = await getLayoutData();
  return (
    <section className="pb-24 pt-6 md:pt-12">
      <div className="container-site">
        <div id="apply" className="bf bf--inline mx-auto max-w-[46rem] scroll-mt-24">
          <div className="bf-head">
            <div className="min-w-0">
              <h1 className="bf-title">{d.applyDialog.title}</h1>
              <p className="bf-sub">{d.applyDialog.sub}</p>
            </div>
          </div>
          <ApplyPanel
            locale={locale}
            jobs={data.openJobs}
            acceptingOpen={data.acceptingOpen}
            dialog={d.applyDialog}
            t={d.apply}
            e={d.errors}
            careersHref={localeHref(locale, "/careers")}
            roleFromLink
          />
        </div>
      </div>
    </section>
  );
}
