import type { Metadata } from "next";
import { SectionHead } from "@/components/site/SectionHead";
import {
  CaseStudyCards,
  CtaBand,
  FaqSection,
  PageIntro,
  ProcessSection,
  ServicesTriad,
  TimelineSection,
  WhySection,
} from "@/components/site/sections";
import { CountUp } from "@/components/site/showcase";
import { getLayoutData, getServicesData, getWorkData } from "@/lib/content";
import { statValue } from "@/lib/format";
import { tx } from "@/lib/i18n";
import { optimizedSrc } from "@/lib/image-url";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, d } = await getDictionary();
  return {
    title: d.servicesPage.title.replace(/\.$/, ""),
    description: d.servicesPage.body,
    alternates: { canonical: `/${locale}/services`, languages: { en: "/en/services", ar: "/ar/services" } },
  };
}

export default async function ServicesPage() {
  const { locale, d } = await getDictionary();
  const [{ settings }, data, work] = await Promise.all([getLayoutData(), getServicesData(), getWorkData()]);
  // Covers of published reels, resized and cached, for the timeline's picture track.
  const frames = work.reels
    .map((r) => r.poster)
    .filter((p): p is string => !!p)
    .slice(0, 6)
    .map((p) => optimizedSrc(p, 640));

  return (
    <>
      <PageIntro tab={d.servicesPage.tab} title={d.servicesPage.title} body={d.servicesPage.body}>
        {settings.stats.some((s) => s.value.trim()) ? (
          <dl className="mt-14 grid gap-px border-y border-chalk/10 bg-chalk/10 sm:grid-cols-3">
            {settings.stats.filter((s) => s.value.trim()).map((s, i) => (
              <div key={i} className="bg-ink-950 py-6 sm:px-6 sm:first:ps-0">
                <dt className="order-2 mt-2 text-[0.95rem] text-smoke">{tx(s.label, locale)}</dt>
                <dd className="heading order-1 text-[clamp(2.4rem,5vw,4rem)] text-chalk" dir="ltr">
                  <CountUp value={statValue(s.value)} />
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </PageIntro>

      {settings.hero.showTimeline ? <TimelineSection locale={locale} d={d} frames={frames} /> : null}
      <ServicesTriad locale={locale} d={d} services={data.services} showMore={false} />
      <ProcessSection locale={locale} d={d} />
      <WhySection locale={locale} d={d} />

      {data.caseStudies.length ? (
        <section className="border-t border-chalk/10 py-20 md:py-28" aria-labelledby="results-title">
          <div className="container-site">
            <SectionHead id="results-title" tab={d.results.tab} title={d.results.title} />
            <div className="mt-12">
              <CaseStudyCards locale={locale} d={d} items={data.caseStudies} />
            </div>
          </div>
        </section>
      ) : null}

      <FaqSection locale={locale} d={d} items={data.faqs} tab={d.servicesPage.faqTab} title={d.servicesPage.faqTitle} />

      <CtaBand locale={locale} d={d} whatsapp={settings.contact.whatsapp} />
    </>
  );
}
