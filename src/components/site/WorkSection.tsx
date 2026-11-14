import { ArrowRight } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { PublicReel } from "@convex/lib/shape";
import { localeHref, type Dictionary, type Locale } from "@/lib/i18n";
import { ReelGrid } from "./ReelGrid";
import { SectionHead } from "./SectionHead";

export function WorkSection({
  locale,
  d,
  reels,
  instagram,
}: {
  locale: Locale;
  d: Dictionary;
  reels: PublicReel[];
  instagram?: string;
}) {
  return (
    <section className="border-t border-chalk/10 py-20 md:py-28" aria-labelledby="work-title">
      <div className="container-site">
        <SectionHead
          id="work-title"
          tab={d.work.tab}
          title={d.work.title}
          body={reels.length ? d.work.body : d.work.empty}
          aside={
            reels.length ? (
              <Link href={localeHref(locale, "/work")} className="btn btn-line mt-6">
                {d.work.all}
                <ArrowRight className="size-4 rtl:-scale-x-100" weight="bold" aria-hidden />
              </Link>
            ) : null
          }
        />
        <div className="mt-12">
          <ReelGrid reels={reels.slice(0, 7)} locale={locale} labels={d.work} instagram={instagram || undefined} />
        </div>
      </div>
    </section>
  );
}
