import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Media } from "@/components/site/Media";
import { ReelGrid } from "@/components/site/ReelGrid";
import { CtaBand } from "@/components/site/sections";
import { getCaseStudy, getLayoutData, getSlugs } from "@/lib/content";
import { localeHref, tx } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/server";

export async function generateStaticParams() {
  const { caseStudies } = await getSlugs();
  const list = caseStudies.map((c) => ({ slug: c.slug }));
  return list.length ? list : [{ slug: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getDictionary();
  const item = await getCaseStudy(slug);
  if (!item) return {};
  return {
    title: tx(item.title, locale),
    description: tx(item.summary, locale),
    alternates: { canonical: `/${locale}/work/${slug}`, languages: { en: `/en/work/${slug}`, ar: `/ar/work/${slug}` } },
    ...(item.cover?.startsWith("http") ? { openGraph: { images: [{ url: item.cover }] } } : {}),
  };
}

export default function CaseStudyPage({ params }: PageProps<"/[locale]/work/[slug]">) {
  return (
    <Suspense fallback={<div className="container-site min-h-[60vh] py-16" aria-hidden />}>
      <CaseStudy params={params} />
    </Suspense>
  );
}

async function CaseStudy({ params }: { params: PageProps<"/[locale]/work/[slug]">["params"] }) {
  const { slug } = await params;
  const { locale, d } = await getDictionary();
  const [item, { settings }] = await Promise.all([getCaseStudy(slug), getLayoutData()]);
  if (!item) notFound();
  const Back = locale === "ar" ? ArrowRight : ArrowLeft;

  return (
    <article>
      <header className="pb-12 pt-10 md:pt-14">
        <div className="container-site">
          <Link href={localeHref(locale, "/work")} className="inline-flex min-h-11 items-center gap-2 text-[0.92rem] text-smoke hover:text-chalk">
            <Back className="size-4" weight="bold" aria-hidden />
            {d.results.back}
          </Link>
          {item.client ? <p className="mono-label mt-8 text-signal">{tx(item.client.name, locale)}</p> : null}
          <h1 className="heading mt-4 max-w-[20ch] text-balance text-[clamp(2.4rem,6.4vw,5.6rem)] text-chalk">{tx(item.title, locale)}</h1>
          <p className="mt-6 max-w-[60ch] text-[1.15rem] leading-relaxed text-smoke">{tx(item.summary, locale)}</p>
        </div>
      </header>

      {item.cover ? (
        <div className="container-site">
          <div className="viewfinder relative aspect-[21/9] overflow-hidden bg-ink-800">
            <Media src={item.cover} alt="" sizes="100vw" className="object-cover" priority />
          </div>
        </div>
      ) : null}

      {item.metrics.length ? (
        <section className="container-site mt-14" aria-label={d.results.title}>
          <dl className="grid gap-px border-y border-chalk/10 bg-chalk/10 sm:grid-cols-2 lg:grid-cols-4">
            {item.metrics.map((m, i) => (
              <div key={i} className="bg-ink-950 py-6 sm:px-6">
                <dt className="text-[0.95rem] text-smoke">{tx(m.label, locale)}</dt>
                <dd className="mt-3 flex items-baseline gap-3" dir="ltr">
                  {m.before ? <span className="font-mono text-[1rem] text-ash line-through decoration-chalk/30">{m.before}</span> : null}
                  <span className="heading text-[clamp(2.2rem,4vw,3.4rem)] text-signal">{m.after}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <div className="container-site grid gap-12 py-16 md:py-24 lg:grid-cols-3">
        {[
          [d.results.challenge, item.challenge],
          [d.results.approach, item.approach],
          [d.results.outcome, item.outcome],
        ].map(([label, text]) =>
          tx(text as typeof item.challenge, locale) ? (
            <section key={label as string}>
              <h2 className="mono-label text-ash">{label as string}</h2>
              <p className="mt-4 whitespace-pre-line text-[1.05rem] leading-relaxed text-chalk/90">{tx(text as typeof item.challenge, locale)}</p>
            </section>
          ) : null,
        )}
      </div>

      {item.reels.length ? (
        <section className="border-t border-chalk/10 py-16 md:py-24" aria-labelledby="case-reels">
          <div className="container-site">
            <h2 id="case-reels" className="heading text-[clamp(2rem,4.4vw,3.4rem)] text-chalk">
              {d.results.reels}
            </h2>
            <div className="mt-10">
              <ReelGrid reels={item.reels} locale={locale} labels={d.work} />
            </div>
          </div>
        </section>
      ) : null}

      <CtaBand locale={locale} d={d} whatsapp={settings.contact.whatsapp} />
    </article>
  );
}
