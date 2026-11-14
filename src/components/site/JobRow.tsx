import Link from "next/link";
import type { PublicJobSummary } from "@convex/lib/shape";
import { localeHref, tx, type Dictionary, type Locale } from "@/lib/i18n";

/** Server- and client-safe row (no icon library, no hooks). */
export function JobRow({ job, locale, d }: { job: PublicJobSummary; locale: Locale; d: Dictionary }) {
  const meta = [d.careersPage.types[job.type], d.careersPage.workplaces[job.workplace], tx(job.location, locale)]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={localeHref(locale, `/careers/${job.slug}`)}
      className="group grid gap-2 py-6 transition-colors sm:grid-cols-12 sm:items-center sm:gap-6"
    >
      <span className="sm:col-span-6">
        <span className="block text-[1.25rem] font-semibold text-chalk transition-colors group-hover:text-signal md:text-[1.4rem]">
          {tx(job.title, locale)}
        </span>
        <span className="mono-label mt-1 block text-ash">{d.careersPage.departments[job.department] ?? job.department}</span>
      </span>
      <span className="text-[0.95rem] text-smoke sm:col-span-5">{meta}</span>
      <span className="hidden justify-self-end sm:col-span-1 sm:block" aria-hidden>
        <span className="grid size-11 place-items-center border border-chalk/15 text-chalk transition-colors group-hover:border-signal group-hover:bg-signal group-hover:text-ink-950">
          <svg viewBox="0 0 256 256" className="size-4 rtl:-scale-x-100" fill="currentColor">
            <path d="M221.66 133.66l-72 72a8 8 0 0 1-11.32-11.32L196.69 136H40a8 8 0 0 1 0-16h156.69l-58.35-58.34a8 8 0 0 1 11.32-11.32l72 72a8 8 0 0 1 0 11.32Z" />
          </svg>
        </span>
      </span>
    </Link>
  );
}
