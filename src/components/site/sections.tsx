import { ArrowRight, ArrowUpRight, Plus } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import type {
  PublicCaseStudy,
  PublicClient,
  PublicFaq,
  PublicJobSummary,
  PublicReel,
  PublicService,
  PublicSettings,
  PublicTestimonial,
} from "@convex/lib/shape";
import { REEL_FORMATS } from "@convex/lib/validators";
import { cn, whatsappLink } from "@/lib/format";
import { fmt, localeHref, tx, type Dictionary, type Locale } from "@/lib/i18n";
import { BriefLink } from "./Brief";
import { HeroTimeline } from "./HeroTimeline";
import { JobRow } from "./JobRow";
import { Media } from "./Media";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { BrandWall, CountUp, FormatShelf, ProcessScrub } from "./showcase";

type Base = { locale: Locale; d: Dictionary };

const Arrow = ({ className }: { className?: string }) => (
  <ArrowRight className={cn("size-4 rtl:-scale-x-100", className)} weight="bold" aria-hidden />
);

/* ------------------------------------------------------------------ */

export function Hero({
  locale,
  d,
  settings,
  openRoles,
  frames,
}: Base & { settings: PublicSettings; openRoles: number; frames: string[] }) {
  const h = settings.hero;
  const roles = openRoles === 1 ? d.hero.role : fmt(d.hero.roles, { n: openRoles });
  return (
    <section className="relative pb-20 pt-8 md:pb-28 md:pt-14" aria-labelledby="hero-title">
      <div className="container-site">
        <p className="mono-label flex items-center gap-3 text-smoke">
          <span className="rec-dot" aria-hidden />
          {tx(h.eyebrow, locale)}
        </p>
        <h1 id="hero-title" className="display hero-title mt-6 text-balance animate-[rise_.8s_var(--ease-out-quart)_both]">
          <span className="block text-chalk">{tx(h.line1, locale)}</span>
          <span className="block text-signal">{tx(h.line2, locale)}</span>
        </h1>
        <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-12 md:items-end">
          <p className="max-w-[46ch] text-[1.08rem] leading-relaxed text-smoke md:col-span-6 md:text-[1.15rem]">
            {tx(h.sub, locale)}
          </p>
          <div className="flex flex-wrap gap-3 md:col-span-6 md:justify-end">
            <BriefLink className="btn btn-signal">
              {d.hero.primary}
              <Arrow />
            </BriefLink>
            <Link href={localeHref(locale, "/careers")} className="btn btn-line">
              {d.hero.secondary}
              {openRoles > 0 ? <span className="font-mono text-[0.78rem] text-signal">{roles}</span> : null}
            </Link>
          </div>
        </div>
        {h.showTimeline ? (
          <div className="mt-12 md:mt-16">
            <HeroTimeline labels={d.hero.timeline} frames={frames} locale={locale} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

/** "518K+": rounded down, so the claim is never bigger than the real number. */
function atLeast(n: number) {
  if (n >= 1_000_000) return `${Math.floor(n / 100_000) / 10}M+`;
  if (n >= 1_000) return `${Math.floor(n / 1_000)}K+`;
  return String(n);
}

export function Roster({ locale, d, clients, audience, title }: Base & { clients: PublicClient[]; audience: number; title?: string }) {
  if (!clients.length) return null;
  return (
    <section className="border-t border-chalk/10 py-20 md:py-28" aria-labelledby="roster-title">
      <div className="container-site">
        <SectionHead
          id="roster-title"
          tab={d.roster.tab}
          title={title ?? d.roster.title}
          body={d.roster.body}
          aside={
            audience > 0 ? (
              <p className="mt-6 flex flex-wrap items-baseline gap-x-3">
                <CountUp value={atLeast(audience)} className="heading text-[clamp(2.4rem,4.5vw,3.6rem)] text-signal" />
                <span className="text-[0.95rem] text-smoke">{d.roster.combined}</span>
              </p>
            ) : undefined
          }
        />
        <div className="mt-12">
          <BrandWall
            clients={clients}
            locale={locale}
            labels={{
              filterLabel: d.roster.filterLabel,
              filterAll: d.roster.filterAll,
              groups: d.roster.groups,
              followers: d.roster.followers,
              visit: d.roster.visit,
            }}
          />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function ServicesTriad({
  locale,
  d,
  services,
  showMore = true,
  headingLevel = "h2",
}: Base & { services: PublicService[]; showMore?: boolean; headingLevel?: "h2" | "h3" }) {
  if (!services.length) return null;
  const Title = headingLevel === "h2" ? "h3" : "h4";
  return (
    <section className="border-t border-chalk/10 py-20 md:py-28" aria-labelledby="services-title">
      <div className="container-site">
        <SectionHead id="services-title" tab={d.services.tab} title={d.services.title} body={d.services.body} />
        <ol className="mt-14 border-t border-chalk/10">
          {services.map((s, i) => (
            <Reveal as="li" key={s.id} className="grid gap-6 border-b border-chalk/10 py-10 md:grid-cols-12 md:gap-8 md:py-16">
              <p
                className={cn(
                  "display text-[clamp(3.4rem,9.5vw,8.5rem)] md:col-span-5",
                  i === services.length - 1 ? "text-signal" : "text-chalk",
                )}
                aria-hidden
              >
                {tx(s.verb, locale)}.
              </p>
              <div className="md:col-span-7 md:pt-4">
                <Title className="text-[1.65rem] font-semibold tracking-tight text-chalk">
                  <span className="sr-only">{tx(s.verb, locale)}. </span>
                  {tx(s.title, locale)}
                </Title>
                <p className="mt-4 max-w-[60ch] text-[1.05rem] leading-relaxed text-smoke">{tx(s.summary, locale)}</p>
                {s.deliverables.length ? (
                  <>
                    <p className="mono-label mt-8 text-ash">{d.services.deliverables}</p>
                    <ul className="mt-3 grid gap-x-8 sm:grid-cols-2">
                      {s.deliverables.map((x, j) => (
                        <li key={j} className="flex items-center gap-3 border-t border-chalk/10 py-3 text-chalk/90">
                          <span className="size-1.5 shrink-0 -skew-x-12 bg-signal" aria-hidden />
                          {tx(x, locale)}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </Reveal>
          ))}
        </ol>
        {showMore ? (
          <Link href={localeHref(locale, "/services")} className="btn btn-line mt-10">
            {d.services.more}
            <Arrow />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function CaseStudyCards({ locale, d, items }: Base & { items: PublicCaseStudy[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={localeHref(locale, `/work/${c.slug}`)}
            className="group flex h-full flex-col border border-chalk/12 bg-ink-900 transition-colors hover:border-signal"
          >
            <span className="relative block aspect-[16/10] overflow-hidden bg-ink-800">
              {c.cover ? (
                <Media src={c.cover} alt="" sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 92vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              ) : null}
            </span>
            <span className="flex flex-1 flex-col p-5 md:p-6">
              {c.client ? <span className="mono-label text-ash">{tx(c.client.name, locale)}</span> : null}
              <span className="heading mt-3 text-[1.7rem] text-chalk">{tx(c.title, locale)}</span>
              <span className="mt-3 line-clamp-3 text-[0.98rem] text-smoke">{tx(c.summary, locale)}</span>
              {c.metrics.length ? (
                <span className="mt-6 grid grid-cols-2 gap-3 border-t border-chalk/10 pt-5">
                  {c.metrics.slice(0, 2).map((m, i) => (
                    <span key={i}>
                      <span className="block font-mono text-[1.35rem] font-medium tabular text-signal">{m.after}</span>
                      <span className="block text-[0.8rem] text-smoke">{tx(m.label, locale)}</span>
                    </span>
                  ))}
                </span>
              ) : null}
              <span className="mt-auto flex items-center gap-2 pt-6 text-[0.92rem] font-semibold text-chalk">
                {d.results.read}
                <Arrow className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CaseStudiesSection({ locale, d, items }: Base & { items: PublicCaseStudy[] }) {
  if (!items.length) return null;
  return (
    <section className="border-t border-chalk/10 py-20 md:py-28" aria-labelledby="results-title">
      <div className="container-site">
        <SectionHead id="results-title" tab={d.results.tab} title={d.results.title} />
        <div className="mt-12">
          <CaseStudyCards locale={locale} d={d} items={items} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function Testimonials({ locale, d, items }: Base & { items: PublicTestimonial[] }) {
  if (!items.length) return null;
  return (
    <section className="border-t border-chalk/10 py-20 md:py-28" aria-label={d.testimonials.tab}>
      <div className="container-site">
        <span className="adv-tab">
          <span>{d.testimonials.tab}</span>
        </span>
        <ul className="mt-10 grid gap-10 md:grid-cols-2">
          {items.map((t) => (
            <Reveal as="li" key={t.id}>
              <figure className="border-s-2 border-signal ps-6">
                <blockquote className="heading text-[clamp(1.5rem,2.6vw,2.3rem)] !leading-[1.1] text-chalk">
                  “{tx(t.quote, locale)}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  {t.photo ? (
                    <span className="relative size-11 overflow-hidden rounded-full bg-ink-800">
                      <Media src={t.photo} alt="" sizes="44px" className="object-cover" />
                    </span>
                  ) : null}
                  <span>
                    <span className="block font-semibold text-chalk">{t.author}</span>
                    <span className="block text-[0.9rem] text-smoke">
                      {[tx(t.role, locale), t.client ? tx(t.client, locale) : ""].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function CareersBand({ locale, d, jobs }: Base & { jobs: PublicJobSummary[] }) {
  const shown = [...jobs].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 5);
  return (
    <section className="border-t border-chalk/10 bg-ink-900 py-20 md:py-28" aria-labelledby="careers-title">
      <div className="container-site">
        <SectionHead id="careers-title" tab={d.careersBand.tab} title={d.careersBand.title} body={d.careersBand.body} />
        {shown.length ? (
          <ul className="mt-12 divide-y divide-chalk/10 border-y border-chalk/10">
            {shown.map((job) => (
              <li key={job.id}>
                <JobRow job={job} locale={locale} d={d} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-12 border-y border-chalk/10 py-8 text-smoke">{d.careersBand.none}</p>
        )}
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link href={localeHref(locale, "/careers")} className="btn btn-signal">
            {d.careersBand.all}
            <Arrow />
          </Link>
          <Link href={localeHref(locale, "/careers/apply")} className="link-underline text-[0.98rem] text-chalk/85 hover:text-chalk">
            {d.careersBand.open}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function CtaBand({ d, whatsapp }: Base & { whatsapp?: string }) {
  return (
    <section className="on-signal bg-signal text-ink-950" aria-labelledby="cta-title">
      <div className="container-site grid gap-10 py-20 md:grid-cols-12 md:items-end md:py-28">
        <h2 id="cta-title" className="display text-[clamp(3.3rem,11vw,10rem)] text-ink-950 md:col-span-8">
          {d.cta.title}
        </h2>
        <div className="md:col-span-4">
          <p className="max-w-[34ch] text-[1.12rem] font-medium leading-relaxed text-ink-950/80">{d.cta.body}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <BriefLink className="btn btn-ink">
              {d.cta.primary}
              <Arrow />
            </BriefLink>
            {whatsapp ? (
              <a
                href={whatsappLink(whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn text-ink-950 shadow-[inset_0_0_0_1px_rgb(14_13_12/0.45)] hover:bg-ink-950/10"
              >
                {d.cta.whatsapp}
                <ArrowUpRight className="size-4" weight="bold" aria-hidden />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function FaqList({ locale, items }: { locale: Locale; items: PublicFaq[] }) {
  return (
    <div className="divide-y divide-chalk/10 border-y border-chalk/10">
      {items.map((f) => (
        <details key={f.id} className="group">
          <summary className="flex min-h-[4.5rem] cursor-pointer list-none items-center justify-between gap-6 py-5 text-[1.12rem] font-semibold text-chalk transition-colors hover:text-signal [&::-webkit-details-marker]:hidden">
            {tx(f.question, locale)}
            <Plus className="size-5 shrink-0 transition-transform duration-300 group-open:rotate-45" weight="bold" aria-hidden />
          </summary>
          <p className="max-w-[68ch] pb-7 text-[1.02rem] leading-relaxed text-smoke">{tx(f.answer, locale)}</p>
        </details>
      ))}
    </div>
  );
}

export function PageIntro({ tab, title, body, children }: { tab: string; title: string; body?: string; children?: ReactNode }) {
  return (
    <section className="pb-14 pt-10 md:pb-20 md:pt-16">
      <div className="container-site">
        <SectionHead as="h1" tab={tab} title={title} body={body} />
        {children}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

/** The headline numbers (Site settings → Numbers), counting up as they scroll in. */
export function StatsBand({ locale, d, stats, className }: Base & { stats: PublicSettings["stats"]; className?: string }) {
  if (!stats.length) return null;
  return (
    <section className={cn("border-t border-chalk/10", className)} aria-label={d.numbers.tab}>
      <div className="container-site">
        <dl className="stats-band">
          {stats.map((s, i) => (
            <div key={i} className="stats-cell">
              <dt className="order-2 max-w-[24ch] text-[0.98rem] leading-snug text-smoke">{tx(s.label, locale)}</dt>
              <dd className="display order-1 text-[clamp(3.2rem,7.5vw,6rem)] text-chalk" dir="ltr">
                <CountUp value={s.value} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function ProcessSection({ d }: Base) {
  return (
    <section className="border-t border-chalk/10 bg-ink-900 py-20 md:py-28" aria-labelledby="process-title">
      <div className="container-site">
        <SectionHead id="process-title" tab={d.servicesPage.processTab} title={d.servicesPage.processTitle} body={d.process.body} />
        <div className="mt-14">
          <ProcessScrub steps={d.servicesPage.steps} nowLabel={d.process.now} />
        </div>
      </div>
    </section>
  );
}

/** Shown first: the formats people recognise fastest. */
const FORMAT_ORDER = ["pov", "skit", "storytelling", "product", "ugc", "voxpop", "bts", "ad", "motion"];

/** Reel formats, illustrated with covers of published reels in that format where there are some. */
export function FormatsSection({ d, reels }: Base & { reels: PublicReel[] }) {
  const stills = new Map<string, string>();
  for (const r of reels) if (r.poster && !stills.has(r.format)) stills.set(r.format, r.poster);
  const keys = [...FORMAT_ORDER, ...REEL_FORMATS.filter((k) => !FORMAT_ORDER.includes(k))].filter((k) => d.formats.items[k]);
  const items = keys.map((key) => ({ key, name: d.work.formats[key] ?? key, ...d.formats.items[key], still: stills.get(key) ?? null }));
  return (
    <section className="overflow-hidden border-t border-chalk/10 py-20 md:py-28" aria-labelledby="formats-title">
      <div className="container-site">
        <SectionHead id="formats-title" tab={d.formats.tab} title={d.formats.title} body={d.formats.body} />
        <div className="mt-10">
          <FormatShelf items={items} labels={{ prev: d.formats.prev, next: d.formats.next, bestFor: d.formats.bestFor, length: d.formats.length }} />
        </div>
      </div>
    </section>
  );
}

export function WhySection({ d, tab, title }: Base & { tab?: string; title?: string }) {
  return (
    <section className="border-t border-chalk/10 py-20 md:py-28" aria-labelledby="why-title">
      <div className="container-site">
        <SectionHead id="why-title" tab={tab ?? d.why.tab} title={title ?? d.why.title} />
        <Reveal as="ul" className="why-grid mt-14">
          {d.why.items.map((item, i) => (
            <li key={i} className="why-item">
              <h3 className="heading why-title">{item.title}</h3>
              <p className="why-body">{item.body}</p>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

export function FaqSection({ locale, d, items, tab, title }: Base & { items: PublicFaq[]; tab?: string; title?: string }) {
  if (!items.length) return null;
  return (
    <section className="border-t border-chalk/10 py-20 md:py-28" aria-labelledby="faq-title">
      <div className="container-site grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <span className="adv-tab">
            <span>{tab ?? d.faqHome.tab}</span>
          </span>
          <h2 id="faq-title" className="heading mt-5 text-[clamp(2rem,4.4vw,3.6rem)] text-chalk">
            {title ?? d.faqHome.title}
          </h2>
        </div>
        <div className="lg:col-span-8">
          <FaqList locale={locale} items={items} />
        </div>
      </div>
    </section>
  );
}
