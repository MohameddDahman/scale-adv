import type { Metadata } from "next";
import { Media } from "@/components/site/Media";
import { ReelGrid } from "@/components/site/ReelGrid";
import { SectionHead } from "@/components/site/SectionHead";
import { CaseStudyCards, CtaBand, PageIntro } from "@/components/site/sections";
import { getLayoutData, getWorkData } from "@/lib/content";
import { formatNumber } from "@/lib/format";
import { fmt, tx } from "@/lib/i18n";
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

      {work.clients.length ? (
        <section className="border-t border-chalk/10 py-20 md:py-28" aria-labelledby="roster-title">
          <div className="container-site">
            <SectionHead
              id="roster-title"
              tab={d.roster.tab}
              title={d.workPage.roster}
              body={work.audience ? fmt(d.roster.audience, { n: formatNumber(work.audience, locale) }) : undefined}
            />
            <ul className="mt-12 grid grid-cols-3 gap-px bg-chalk/10 sm:grid-cols-4 lg:grid-cols-6">
              {work.clients.map((c) => (
                <li key={c.id} className="group bg-ink-950">
                  <div className="relative aspect-square overflow-hidden">
                    {c.logo ? (
                      <Media
                        src={c.logo}
                        alt={tx(c.name, locale)}
                        sizes="(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 33vw"
                        className="object-cover opacity-90 grayscale-[35%] transition duration-500 group-hover:opacity-100 group-hover:grayscale-0"
                      />
                    ) : (
                      <span className="heading grid size-full place-items-center p-3 text-center text-lg text-chalk">{tx(c.name, locale)}</span>
                    )}
                  </div>
                  <p className="truncate px-3 py-3 text-[0.85rem] text-smoke">{tx(c.name, locale)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <CtaBand locale={locale} d={d} whatsapp={settings.contact.whatsapp} />
    </>
  );
}
