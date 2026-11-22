import type { Metadata, Viewport } from "next";
import { ApplyProvider } from "@/components/site/Apply";
import { BriefProvider } from "@/components/site/Brief";
import { Intro, INTRO_HEAD_SCRIPT } from "@/components/site/Intro";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { briefText } from "@/lib/brief-text";
import { getLayoutData } from "@/lib/content";
import { fontVariables } from "@/lib/fonts";
import { dirOf, localeHref, tx } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/site-url";
import "../globals.css";

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export const viewport: Viewport = {
  themeColor: "#0e0d0c",
  colorScheme: "dark",
};

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getDictionary();
  const { settings } = await getLayoutData();
  const title = tx(settings.seo.title, locale);
  const description = tx(settings.seo.description, locale);
  const image = settings.seo.ogImage ?? "/api/og";
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s — ${settings.general.agencyName}` },
    description,
    applicationName: settings.general.agencyName,
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", ar: "/ar", "x-default": "/en" },
    },
    openGraph: {
      type: "website",
      siteName: settings.general.agencyName,
      locale: locale === "ar" ? "ar_EG" : "en_US",
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: settings.general.agencyName }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const { locale, d } = await getDictionary();
  const data = await getLayoutData();
  const { announcement } = data.settings;

  return (
    // The head script adds data-js / data-intro before the first paint, hence suppressHydrationWarning.
    <html lang={locale} dir={dirOf(locale)} className={`${fontVariables} site`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_HEAD_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-ink-950">
        <Intro tagline={tx(data.settings.hero.eyebrow, locale)} />
        <BriefProvider
          locale={locale}
          text={briefText(d)}
          contactHref={localeHref(locale, "/contact")}
          clientHref={localeHref(locale, "/client")}
        >
          <ApplyProvider
            locale={locale}
            jobs={data.openJobs}
            acceptingOpen={data.acceptingOpen}
            dialog={d.applyDialog}
            t={d.apply}
            e={d.errors}
            careersHref={localeHref(locale, "/careers")}
            applyHref={localeHref(locale, "/apply")}
          >
          <a
            href="#main"
            className="fixed start-4 top-3 z-[60] -translate-y-24 bg-signal px-4 py-3 font-semibold text-ink-950 transition-transform focus:translate-y-0"
          >
            {d.nav.skip}
          </a>
          <SiteHeader
            locale={locale}
            nav={d.nav}
            openRoles={data.openRoles}
            announcement={announcement.enabled ? { text: tx(announcement.text, locale), href: announcement.href } : null}
          />
          <main id="main" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <SiteFooter locale={locale} d={d} data={data} />
          </ApplyProvider>
        </BriefProvider>
      </body>
    </html>
  );
}
