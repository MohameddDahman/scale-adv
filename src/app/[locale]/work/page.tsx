import type { Metadata } from "next";
import { ReelGrid } from "@/components/site/ReelGrid";
import { SectionHead } from "@/components/site/SectionHead";
import { CaseStudyCards, CtaBand, PageIntro, Roster } from "@/components/site/sections";
import { getLayoutData, getWorkData } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, d } = await getDictionary();
  return {
    title: d.workPage.title.replace(/\.$/, ""),
    description: d.workPage.body,
    alternates: { canonical: `/${locale}/work`, languages: { en: "/en/work", ar: "/ar/work" } },
  };
}

export default async function WorkPage() {
  const { locale, d } = await getDictionary();
  const [{ settings }, work] = await Promise.all([getLayoutData(), getWorkData()]);

  return (
    <>
      <PageIntro tab={d.workPage.tab} title={d.workPage.title} body={work.reels.length ? d.workPage.body : d.work.empty} />

      <section className="border-t border-chalk/10 pb-20 pt-12 md:pb-28" aria-label={d.work.tab}>
        <div className="container-site">
          <ReelGrid reels={work.reels} locale={locale} labels={d.work} instagram={settings.social.instagram || undefined} filters columns="wide" />
        </div>
      </section>

      {work.caseStudies.length ? (
        <section className="border-t border-chalk/10 py-20 md:py-28" aria-labelledby="cases-title">
          <div className="container-site">
            <SectionHead id="cases-title" tab={d.results.tab} title={d.workPage.caseStudies} />
            <div className="mt-12">
              <CaseStudyCards locale={locale} d={d} items={work.caseStudies} />
            </div>
          </div>
        </section>
      ) : null}

      <Roster locale={locale} d={d} clients={work.clients} audience={work.audience} title={d.workPage.roster} />

      <CtaBand locale={locale} d={d} whatsapp={settings.contact.whatsapp} />
    </>
  );
}
