import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Media } from "@/components/site/Media";
import { SectionHead } from "@/components/site/SectionHead";
import { CtaBand, PageIntro, ProcessSection, Roster, StatsBand, WhySection } from "@/components/site/sections";
import { getCareersData, getLayoutData, getWorkData } from "@/lib/content";
import { localeHref, tx } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, d } = await getDictionary();
  return {
    title: d.agencyPage.title.replace(/\.$/, ""),
    description: d.agencyPage.body,
    alternates: { canonical: `/${locale}/agency`, languages: { en: "/en/agency", ar: "/ar/agency" } },
  };
}

export default async function AgencyPage() {
  const { locale, d } = await getDictionary();
  const [{ settings, openRoles }, work, careers] = await Promise.all([getLayoutData(), getWorkData(), getCareersData()]);
  const a = d.agencyPage;

  return (
    <>
      <PageIntro tab={a.tab} title={a.title} body={a.body} />
      <StatsBand locale={locale} d={d} stats={settings.stats} className="pb-6" />
      <WhySection locale={locale} d={d} tab={a.principlesTab} title={a.principlesTitle} />
      <ProcessSection locale={locale} d={d} />
      <Roster locale={locale} d={d} clients={work.clients} audience={work.audience} />

      {careers.team.length ? (
        <section className="border-t border-chalk/10 py-20 md:py-28" aria-labelledby="team-title">
          <div className="container-site">
            <SectionHead id="team-title" tab={a.teamTab} title={a.teamTitle} />
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

      <section className="border-t border-chalk/10 py-20 md:py-28" aria-labelledby="join-title">
        <div className="container-site grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <h2 id="join-title" className="heading text-balance text-[clamp(2.2rem,5vw,4.25rem)] text-chalk">
              {a.joinTitle}
            </h2>
            <p className="mt-5 max-w-[48ch] text-[1.05rem] leading-relaxed text-smoke">{a.joinBody}</p>
          </div>
          <div className="md:col-span-4 md:justify-self-end">
            <Link href={localeHref(locale, "/careers")} className="btn btn-line">
              {a.joinCta}
              {openRoles > 0 ? (
                <span className="font-mono text-[0.78rem] text-signal" dir="ltr">
                  {openRoles}
                </span>
              ) : null}
              <ArrowRight className="size-4 rtl:-scale-x-100" weight="bold" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <CtaBand locale={locale} d={d} whatsapp={settings.contact.whatsapp} />
    </>
  );
}
