import type { Metadata } from "next";
import { BriefFlow } from "@/components/site/BriefFlow";
import { LogoMarquee } from "@/components/site/showcase";
import { briefText } from "@/lib/brief-text";
import { getHomeData } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, d } = await getDictionary();
  return {
    title: d.brief.title,
    description: d.brief.description,
    alternates: { canonical: `/${locale}/client`, languages: { en: "/en/client", ar: "/ar/client" } },
  };
}

/** The link to share with future clients (scaleadv.org/client): just the form, with the brands under it. */
export default async function ClientPage() {
  const { locale, d } = await getDictionary();
  const { clients } = await getHomeData();
  return (
    <section className="pb-24 pt-6 md:pt-12">
      <div className="container-site">
        <h1 className="sr-only">{d.brief.title}</h1>
        <div id="brief" className="mx-auto max-w-[38rem] scroll-mt-24">
          <BriefFlow locale={locale} text={briefText(d)} mode="inline" />
        </div>
        <div className="mx-auto max-w-[64rem]">
          <LogoMarquee
            clients={clients}
            locale={locale}
            caption={d.roster.strip}
            labels={{ region: d.roster.slider, prev: d.roster.prev, next: d.roster.next }}
          />
        </div>
      </div>
    </section>
  );
}
