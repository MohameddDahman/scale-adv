import type { Metadata } from "next";
import { SectionHead } from "@/components/site/SectionHead";
import { CaseStudyCards, CtaBand, FaqList, PageIntro, ServicesTriad } from "@/components/site/sections";
import { getLayoutData, getServicesData } from "@/lib/content";
import { tx } from "@/lib/i18n";
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
  const [{ settings }, data] = await Promise.all([getLayoutData(), getServicesData()]);

  return (
    <>
      <PageIntro tab={d.servicesPage.tab} title={d.servicesPage.title} body={d.servicesPage.body}>
        {settings.stats.length ? (
          <dl className="mt-14 grid gap-px border-y border-chalk/10 bg-chalk/10 sm:grid-cols-3">
            {settings.stats.map((s, i) => (
              <div key={i} className="bg-ink-950 py-6 sm:px-6 sm:first:ps-0">
                <dt className="order-2 mt-2 text-[0.95rem] text-smoke">{tx(s.label, locale)}</dt>
                <dd className="heading order-1 text-[clamp(2.4rem,5vw,4rem)] text-chalk" dir="ltr">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </PageIntro>

      <ServicesTriad locale={locale} d={d} services={data.services} showMore={false} />

      <section className="border-t border-chalk/10 bg-ink-900 py-20 md:py-28" aria-labelledby="process-title">
        <div className="container-site">
          <SectionHead id="process-title" tab={d.servicesPage.processTab} title={d.servicesPage.processTitle} />
          <ol className="mt-14 grid gap-px bg-chalk/10 md:grid-cols-2 lg:grid-cols-3">
            {d.servicesPage.steps.map((step, i) => (
              <li key={i} className="bg-ink-900 p-6 md:p-8">
                <span className="font-mono text-[0.85rem] text-signal" dir="ltr">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-6 text-[1.35rem] font-semibold text-chalk">{step.title}</h3>
                <p className="mt-3 max-w-[40ch] text-[0.98rem] leading-relaxed text-smoke">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

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

      {data.faqs.length ? (
        <section className="border-t border-chalk/10 py-20 md:py-28" aria-labelledby="faq-title">
          <div className="container-site grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <span className="adv-tab">
                <span>{d.servicesPage.faqTab}</span>
              </span>
              <h2 id="faq-title" className="heading mt-5 text-[clamp(2rem,4.4vw,3.6rem)] text-chalk">
                {d.servicesPage.faqTitle}
              </h2>
            </div>
            <div className="lg:col-span-8">
              <FaqList locale={locale} items={data.faqs} />
            </div>
          </div>
        </section>
      ) : null}

      <CtaBand locale={locale} d={d} whatsapp={settings.contact.whatsapp} />
    </>
  );
}
