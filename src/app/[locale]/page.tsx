import { JsonLd } from "@/components/site/JsonLd";
import {
  CareersBand,
  CaseStudiesSection,
  CtaBand,
  Hero,
  Roster,
  ServicesTriad,
  Testimonials,
} from "@/components/site/sections";
import { WorkSection } from "@/components/site/WorkSection";
import { getHomeData, getLayoutData } from "@/lib/content";
import { tx } from "@/lib/i18n";
import { optimizedSrc } from "@/lib/image-url";
import { getDictionary } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/site-url";

export default async function HomePage() {
  const { locale, d } = await getDictionary();
  const [layout, home] = await Promise.all([getLayoutData(), getHomeData()]);
  const { settings } = layout;
  // Resized, cached copies: the hero shows these small, and they're also used as CSS backgrounds.
  const frames = home.reels
    .map((r) => r.poster)
    .filter((p): p is string => !!p)
    .slice(0, 6)
    .map((p) => optimizedSrc(p, 640));
  const sameAs = Object.values(settings.social).filter(Boolean);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: settings.general.agencyName,
          description: tx(settings.seo.description, locale),
          url: `${siteUrl()}/${locale}`,
          ...(sameAs.length ? { sameAs } : {}),
          ...(settings.contact.email ? { email: settings.contact.email } : {}),
          ...(settings.contact.phone ? { telephone: settings.contact.phone } : {}),
          address: { "@type": "PostalAddress", addressCountry: "EG" },
        }}
      />
      <Hero locale={locale} d={d} settings={settings} openRoles={layout.openRoles} frames={frames} />
      <Roster locale={locale} d={d} clients={home.clients} audience={home.audience} />
      <ServicesTriad locale={locale} d={d} services={home.services} />
      <WorkSection locale={locale} d={d} reels={home.reels} instagram={settings.social.instagram} />
      <CaseStudiesSection locale={locale} d={d} items={home.caseStudies} />
      <Testimonials locale={locale} d={d} items={home.testimonials} />
      <CareersBand locale={locale} d={d} jobs={home.jobs} />
      <CtaBand locale={locale} d={d} whatsapp={settings.contact.whatsapp} />
    </>
  );
}
