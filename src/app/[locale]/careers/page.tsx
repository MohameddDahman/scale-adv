import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { JobsBoard } from "@/components/site/JobsBoard";
import { Media } from "@/components/site/Media";
import { SectionHead } from "@/components/site/SectionHead";
import { FaqList, PageIntro } from "@/components/site/sections";
import { getCareersData, getLayoutData } from "@/lib/content";
import { fmt, localeHref, tx } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, d } = await getDictionary();
  const { settings } = await getLayoutData();
  return {
    title: d.careersPage.title.replace(/\.$/, ""),
    description: tx(settings.careers.intro, locale),
    alternates: { canonical: `/${locale}/careers`, languages: { en: "/en/careers", ar: "/ar/careers" } },
  };
}

export default async function CareersPage() {
  const { locale, d } = await getDictionary();
  const [{ settings }, careers] = await Promise.all([getLayoutData(), getCareersData()]);
  const c = settings.careers;
  const jobs = [...careers.jobs].sort((a, b) => Number(b.featured) - Number(a.featured));

  return (
    <>
      <PageIntro tab={d.careersPage.tab} title={d.careersPage.title} body={tx(c.intro, locale)} />

      <section className="border-t border-chalk/10 py-16 md:py-24" aria-labelledby="roles-title" id="roles">
        <div className="container-site">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 id="roles-title" className="heading text-[clamp(2rem,4.4vw,3.6rem)] text-chalk">
              {d.careersPage.rolesTitle}
            </h2>
            {jobs.length ? (
              <span className="adv-tab adv-tab--ghost">
                <span>{fmt(d.careersPage.rolesCount, { n: jobs.length })}</span>
              </span>
            ) : null}
          </div>
          {jobs.length ? (
            <JobsBoard jobs={jobs} locale={locale} d={d} />
          ) : (
            <p className="border-y border-chalk/10 py-8 text-[1.05rem] text-smoke">{d.careersPage.closed}</p>
          )}
        </div>
      </section>

      {c.perks.length ? (
        <section className="border-t border-chalk/10 bg-ink-900 py-16 md:py-24" aria-labelledby="perks-title">
          <div className="container-site">
            <h2 id="perks-title" className="heading text-[clamp(2rem,4.4vw,3.6rem)] text-chalk">
              {d.careersPage.perksTitle}
            </h2>
            <ul className="mt-12 grid gap-px bg-chalk/10 sm:grid-cols-2 lg:grid-cols-4">
              {c.perks.map((p, i) => (
                <li key={i} className="bg-ink-900 p-6 md:p-8">
                  <span className="block h-[3px] w-8 -skew-x-[14deg] bg-signal" aria-hidden />
                  <h3 className="mt-6 text-[1.25rem] font-semibold text-chalk">{tx(p.title, locale)}</h3>
                  <p className="mt-3 text-[0.98rem] leading-relaxed text-smoke">{tx(p.body, locale)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {c.steps.length ? (
        <section className="border-t border-chalk/10 py-16 md:py-24" aria-labelledby="steps-title">
          <div className="container-site">
            <h2 id="steps-title" className="heading text-[clamp(2rem,4.4vw,3.6rem)] text-chalk">
              {d.careersPage.stepsTitle}
            </h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-5 md:gap-4">
              {c.steps.map((s, i) => (
                <li key={i} className="relative border-t border-chalk/15 pt-6">
                  <span className="absolute -top-px start-0 h-[2px] w-10 bg-signal" aria-hidden />
                  <span className="font-mono text-[0.8rem] text-signal" dir="ltr">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-[1.15rem] font-semibold text-chalk">{tx(s.title, locale)}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-smoke">{tx(s.body, locale)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {careers.team.length ? (
        <section className="border-t border-chalk/10 py-16 md:py-24" aria-labelledby="team-title">
          <div className="container-site">
            <h2 id="team-title" className="heading text-[clamp(2rem,4.4vw,3.6rem)] text-chalk">
              {d.careersPage.teamTitle}
            </h2>
            <ul className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
              {careers.team.map((m) => (
                <li key={m.id}>
                  <div className="viewfinder relative aspect-[4/5] overflow-hidden bg-ink-800">
                    {m.photo ? <Media src={m.photo} alt={tx(m.name, locale)} sizes="(min-width: 768px) 22vw, 45vw" className="object-cover" /> : null}
                  </div>
                  <p className="mt-3 font-semibold text-chalk">{tx(m.name, locale)}</p>
                  <p className="text-[0.9rem] text-smoke">{tx(m.role, locale)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {careers.faqs.length ? (
        <section className="border-t border-chalk/10 py-16 md:py-24" aria-labelledby="faq-title">
          <div className="container-site grid gap-10 lg:grid-cols-12">
            <h2 id="faq-title" className="heading text-[clamp(2rem,4.4vw,3.6rem)] text-chalk lg:col-span-4">
              {d.careersPage.faqTitle}
            </h2>
            <div className="lg:col-span-8">
              <FaqList locale={locale} items={careers.faqs} />
            </div>
          </div>
        </section>
      ) : null}

      {c.accepting ? (
        <section className="border-t border-chalk/10 py-16 md:py-24">
          <div className="container-site">
            <div className="grid gap-8 border border-chalk/15 p-8 md:grid-cols-12 md:items-center md:p-12">
              <div className="md:col-span-8">
                <SectionHead tab={d.careersPage.tab} title={d.careersPage.openTitle} />
                <p className="mt-5 max-w-[56ch] text-[1.05rem] leading-relaxed text-smoke">{d.careersPage.openBody}</p>
              </div>
              <div className="md:col-span-4 md:justify-self-end">
                <Link href={localeHref(locale, "/careers/apply")} className="btn btn-signal">
                  {d.careersPage.openCta}
                  <ArrowRight className="size-4 rtl:-scale-x-100" weight="bold" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
