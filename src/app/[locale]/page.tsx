import { JsonLd } from "@/components/site/JsonLd";
import {
  CareersBand,
  CaseStudiesSection,
  CtaBand,
  FaqSection,
  Hero,
  ProcessSection,
  ServicesTriad,
  Testimonials,
  WhySection,
} from "@/components/site/sections";
import { WorkSection } from "@/components/site/WorkSection";
import { getHomeData, getLayoutData, getServicesData } from "@/lib/content";
import { tx } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/site-url";

export default async function HomePage() {
  const { locale, d } = await getDictionary();
  const [layout, home, services] = await Promise.all([getLayoutData(), getHomeData(), getServicesData()]);
  const { settings } = layout;
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
      <Hero locale={locale} d={d} settings={settings} openRoles={layout.openRoles} clients={home.clients} />
      <ServicesTriad locale={locale} d={d} services={home.services} />
      <ProcessSection locale={locale} d={d} />
      <WorkSection locale={locale} d={d} reels={home.reels} instagram={settings.social.instagram} />
      <WhySection locale={locale} d={d} />
      <CaseStudiesSection locale={locale} d={d} items={home.caseStudies} />
      <Testimonials locale={locale} d={d} items={home.testimonials} />
      <FaqSection locale={locale} d={d} items={services.faqs.slice(0, 6)} />
      <CareersBand locale={locale} d={d} jobs={home.jobs} />
      <CtaBand locale={locale} d={d} whatsapp={settings.contact.whatsapp} />
    </>
  );
}
