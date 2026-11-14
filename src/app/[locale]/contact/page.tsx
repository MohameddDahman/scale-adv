import { EnvelopeSimple, Phone, WhatsappLogo } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { LeadForm } from "@/components/site/LeadForm";
import { PageIntro } from "@/components/site/sections";
import { getLayoutData } from "@/lib/content";
import { whatsappLink } from "@/lib/format";
import { tx } from "@/lib/i18n";
import en from "@/lib/i18n/en";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, d } = await getDictionary();
  return {
    title: d.contactPage.title.replace(/\.$/, ""),
    description: d.contactPage.body,
    alternates: { canonical: `/${locale}/contact`, languages: { en: "/en/contact", ar: "/ar/contact" } },
  };
}

export default async function ContactPage() {
  const { locale, d } = await getDictionary();
  const { settings } = await getLayoutData();
  const c = settings.contact;
  const address = tx(c.address, locale);
  const hours = tx(c.hours, locale);
  const hasDirect = c.whatsapp || c.phone || c.email;

  return (
    <>
      <PageIntro tab={d.contactPage.tab} title={d.contactPage.title} body={d.contactPage.body} />
      <section className="border-t border-chalk/10 pb-24 pt-12">
        <div className="container-site grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <LeadForm
              locale={locale}
              t={d.contactPage}
              e={d.errors}
              values={{ budgets: en.contactPage.budgets, industries: en.contactPage.industries, sources: en.contactPage.sources }}
            />
          </div>

          <aside className="space-y-12 lg:col-span-4 lg:col-start-9">
            <div>
              <h2 className="mono-label text-ash">{d.contactPage.nextTitle}</h2>
              <ol className="mt-5">
                {d.contactPage.next.map((step, i) => (
                  <li key={i} className="flex gap-4 border-t border-chalk/10 py-4">
                    <span className="font-mono text-[0.85rem] text-signal" dir="ltr">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[1rem] leading-relaxed text-chalk/90">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {hasDirect ? (
              <div>
                <h2 className="mono-label text-ash">{d.contactPage.direct}</h2>
                <ul className="mt-5 space-y-2">
                  {c.whatsapp ? (
                    <li>
                      <a href={whatsappLink(c.whatsapp)} target="_blank" rel="noopener noreferrer" className="group flex min-h-12 items-center gap-3 text-chalk hover:text-signal">
                        <WhatsappLogo className="size-5" aria-hidden />
                        <span>{d.footer.whatsapp}</span>
                        <span className="ms-auto font-mono text-[0.9rem] text-smoke group-hover:text-signal" dir="ltr">
                          {c.whatsapp}
                        </span>
                      </a>
                    </li>
                  ) : null}
                  {c.phone ? (
                    <li>
                      <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="group flex min-h-12 items-center gap-3 text-chalk hover:text-signal">
                        <Phone className="size-5" aria-hidden />
                        <span>{d.footer.phone}</span>
                        <span className="ms-auto font-mono text-[0.9rem] text-smoke group-hover:text-signal" dir="ltr">
                          {c.phone}
                        </span>
                      </a>
                    </li>
                  ) : null}
                  {c.email ? (
                    <li>
                      <a href={`mailto:${c.email}`} className="group flex min-h-12 items-center gap-3 text-chalk hover:text-signal">
                        <EnvelopeSimple className="size-5" aria-hidden />
                        <span>{d.footer.email}</span>
                        <span className="ms-auto truncate font-mono text-[0.9rem] text-smoke group-hover:text-signal">{c.email}</span>
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            {address || hours ? (
              <div className="text-[0.95rem] leading-relaxed text-smoke">
                {address ? <p className="text-chalk/90">{address}</p> : null}
                {hours ? <p>{hours}</p> : null}
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </>
  );
}
