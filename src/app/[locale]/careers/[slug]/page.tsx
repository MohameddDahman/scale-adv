import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ApplicationForm } from "@/components/site/ApplicationForm";
import { JsonLd } from "@/components/site/JsonLd";
import { getJob, getLayoutData, getSlugs } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { fmt, localeHref, tx, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/site-url";
import type { JobData } from "@/lib/content";

export async function generateStaticParams() {
  const { jobs } = await getSlugs();
  const list = jobs.map((j) => ({ slug: j.slug }));
  return list.length ? list : [{ slug: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/careers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getDictionary();
  const job = await getJob(slug);
  if (!job) return {};
  const image = `/api/og?job=${encodeURIComponent(slug)}`;
  return {
    title: tx(job.title, locale),
    description: tx(job.summary, locale),
    openGraph: { images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [image] },
    alternates: {
      canonical: `/${locale}/careers/${slug}`,
      languages: { en: `/en/careers/${slug}`, ar: `/ar/careers/${slug}` },
    },
  };
}

export default function JobPage({ params }: PageProps<"/[locale]/careers/[slug]">) {
  return (
    <Suspense fallback={<JobSkeleton />}>
      <JobContent params={params} />
    </Suspense>
  );
}

function JobSkeleton() {
  return (
    <div className="container-site animate-pulse py-16" aria-hidden>
      <div className="h-4 w-24 bg-ink-800" />
      <div className="mt-8 h-16 w-3/4 bg-ink-800" />
      <div className="mt-6 h-5 w-1/2 bg-ink-800" />
      <div className="mt-16 grid gap-10 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-4 bg-ink-800" />
          ))}
        </div>
      </div>
    </div>
  );
}

const EMPLOYMENT: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  internship: "INTERN",
  freelance: "CONTRACTOR",
  talent: "PER_DIEM",
};

async function JobContent({ params }: { params: PageProps<"/[locale]/careers/[slug]">["params"] }) {
  const { slug } = await params;
  const { locale, d } = await getDictionary();
  const [job, { settings }] = await Promise.all([getJob(slug), getLayoutData()]);
  if (!job) notFound();

  const open = job.status === "open";
  const Back = locale === "ar" ? ArrowRight : ArrowLeft;

  return (
    <article>
      {open ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: job.title.en || job.title.ar,
            description: [job.summary.en, ...job.responsibilities.map((r) => r.en), ...job.requirements.map((r) => r.en)]
              .filter(Boolean)
              .map((line) => `<p>${line.replace(/</g, "&lt;")}</p>`)
              .join(""),
            datePosted: new Date(job.publishedAt ?? Date.UTC(2026, 0, 1)).toISOString().slice(0, 10),
            ...(job.closesAt ? { validThrough: new Date(job.closesAt).toISOString() } : {}),
            employmentType: EMPLOYMENT[job.type] ?? "OTHER",
            hiringOrganization: { "@type": "Organization", name: settings.general.agencyName, sameAs: `${siteUrl()}/${locale}` },
            ...(job.workplace === "remote"
              ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "Egypt" } }
              : { jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressCountry: "EG" } } }),
            directApply: true,
            url: `${siteUrl()}/${locale}/careers/${job.slug}`,
          }}
        />
      ) : null}

      <header className="pb-12 pt-10 md:pb-16 md:pt-14">
        <div className="container-site">
          <Link href={localeHref(locale, "/careers")} className="inline-flex min-h-11 items-center gap-2 text-[0.92rem] text-smoke hover:text-chalk">
            <Back className="size-4" weight="bold" aria-hidden />
            {d.job.back}
          </Link>
          <p className="mono-label mt-8 text-signal">{d.careersPage.departments[job.department] ?? job.department}</p>
          <h1 className="heading mt-4 max-w-[18ch] text-balance text-[clamp(2.4rem,6.4vw,5.6rem)] text-chalk">{tx(job.title, locale)}</h1>
          <ul className="mt-8 flex flex-wrap gap-2">
            {[d.careersPage.types[job.type], d.careersPage.workplaces[job.workplace], tx(job.location, locale)]
              .filter(Boolean)
              .map((chip) => (
                <li key={chip} className="border border-chalk/15 px-3 py-2 text-[0.88rem] text-chalk/90">
                  {chip}
                </li>
              ))}
          </ul>
        </div>
      </header>

      <div className="container-site grid gap-14 border-t border-chalk/10 pb-24 pt-12 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-7">
          <section>
            <h2 className="mono-label text-ash">{d.job.about}</h2>
            <p className="mt-4 text-[1.2rem] leading-relaxed text-chalk">{tx(job.summary, locale)}</p>
          </section>
          <List title={d.job.responsibilities} items={job.responsibilities} locale={locale} />
          <List title={d.job.requirements} items={job.requirements} locale={locale} />
          <List title={d.job.niceToHave} items={job.niceToHave} locale={locale} />
          <List title={d.job.perks} items={job.perks} locale={locale} />
        </div>

        <aside className="lg:col-span-4 lg:col-start-9">
          <div className="border border-chalk/15 bg-ink-900 p-6 lg:sticky lg:top-28">
            <dl className="divide-y divide-chalk/10 text-[0.95rem]">
              <Meta label={d.job.department} value={d.careersPage.departments[job.department] ?? job.department} />
              <Meta label={d.job.type} value={d.careersPage.types[job.type] ?? job.type} />
              <Meta label={d.job.location} value={tx(job.location, locale)} />
              {tx(job.salary, locale) ? <Meta label={d.job.salary} value={tx(job.salary, locale)} /> : null}
            </dl>
            {job.publishedAt ? (
              <p className="mt-4 text-[0.85rem] text-ash">{fmt(d.job.posted, { date: formatDate(job.publishedAt, locale) })}</p>
            ) : null}
            {job.closesAt ? (
              <p className="mt-1 text-[0.85rem] text-ash">{fmt(d.job.closes, { date: formatDate(job.closesAt, locale) })}</p>
            ) : null}
            {open ? (
              <a href="#apply" className="btn btn-signal mt-6 w-full">
                {d.job.apply}
              </a>
            ) : null}
          </div>
        </aside>
      </div>

      <section id="apply" className="scroll-mt-24 border-t border-chalk/10 bg-ink-900 py-16 md:py-24" aria-labelledby="apply-title">
        <div className="container-site grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="apply-title" className="heading text-[clamp(2rem,4.4vw,3.4rem)] text-chalk">
              {open ? d.job.applyTitle : d.job.closedTitle}
            </h2>
            {!open ? <p className="mt-4 text-smoke">{d.job.closedBody}</p> : null}
          </div>
          <div className="lg:col-span-8">
            {open ? (
              <ApplicationForm
                locale={locale}
                t={d.apply}
                e={d.errors}
                job={{ slug: job.slug, type: job.type, questions: job.questions }}
                careersHref={localeHref(locale, "/careers")}
              />
            ) : (
              <Link href={localeHref(locale, "/careers")} className="btn btn-signal">
                {d.job.back}
              </Link>
            )}
          </div>
        </div>
      </section>
    </article>
  );
}

function List({ title, items, locale }: { title: string; items: JobData["requirements"]; locale: Locale }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mono-label text-ash">{title}</h2>
      <ul className="mt-4">
        {items.map((item, i) => (
          <li key={i} className="flex gap-4 border-t border-chalk/10 py-4 text-[1.04rem] leading-relaxed text-chalk/90">
            <span className="mt-[0.6em] size-1.5 shrink-0 -skew-x-12 bg-signal" aria-hidden />
            {tx(item, locale)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-smoke">{label}</dt>
      <dd className="text-end font-medium text-chalk">{value}</dd>
    </div>
  );
}

