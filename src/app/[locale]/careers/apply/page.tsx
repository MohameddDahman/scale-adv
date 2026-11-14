import type { Metadata } from "next";
import { ApplicationForm } from "@/components/site/ApplicationForm";
import { PageIntro } from "@/components/site/sections";
import { getLayoutData } from "@/lib/content";
import { localeHref } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, d } = await getDictionary();
  return {
    title: d.apply.openTitle,
    description: d.apply.openBody,
    alternates: { canonical: `/${locale}/careers/apply`, languages: { en: "/en/careers/apply", ar: "/ar/careers/apply" } },
  };
}

export default async function OpenApplicationPage() {
  const { locale, d } = await getDictionary();
  const { settings } = await getLayoutData();
  return (
    <>
      <PageIntro tab={d.careersPage.tab} title={d.apply.openTitle} body={d.apply.openBody} />
      <section className="border-t border-chalk/10 pb-24 pt-12">
        <div className="container-site grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {settings.careers.accepting ? (
              <ApplicationForm locale={locale} t={d.apply} e={d.errors} job={null} careersHref={localeHref(locale, "/careers")} />
            ) : (
              <p className="text-[1.05rem] text-smoke">{d.careersPage.closed}</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
