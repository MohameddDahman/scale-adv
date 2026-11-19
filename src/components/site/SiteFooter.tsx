import {
  BehanceLogo,
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  TiktokLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/ssr";
import { cacheLife } from "next/cache";
import Link from "next/link";
import type { LayoutData } from "@/lib/content";
import { whatsappLink } from "@/lib/format";
import { fmt, localeHref, tx, type Dictionary, type Locale } from "@/lib/i18n";
import { Wordmark } from "./Wordmark";

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

const SOCIAL = [
  { key: "instagram", label: "Instagram", Icon: InstagramLogo },
  { key: "facebook", label: "Facebook", Icon: FacebookLogo },
  { key: "tiktok", label: "TikTok", Icon: TiktokLogo },
  { key: "youtube", label: "YouTube", Icon: YoutubeLogo },
  { key: "linkedin", label: "LinkedIn", Icon: LinkedinLogo },
  { key: "behance", label: "Behance", Icon: BehanceLogo },
] as const;

export async function SiteFooter({ locale, d, data }: { locale: Locale; d: Dictionary; data: LayoutData }) {
  const { settings, openRoles } = data;
  const { contact, social, general } = settings;
  const year = await currentYear();
  const socials = SOCIAL.filter((s) => social[s.key]?.trim());
  const address = tx(contact.address, locale);
  const hours = tx(contact.hours, locale);

  return (
    <footer className="relative overflow-hidden border-t border-chalk/10 bg-ink-950 pt-20">
      <div className="container-site">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link href={localeHref(locale, "/")} aria-label={d.nav.home} className="inline-block text-[3.25rem] md:text-[4.5rem]">
              <Wordmark tagline={tx(general.tagline, "en")} />
            </Link>
            <p className="mt-6 max-w-[36ch] text-[1.02rem] leading-relaxed text-smoke">{tx(general.footerNote, locale)}</p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7">
            <div>
              <h2 className="mono-label text-ash">{d.footer.pages}</h2>
              <ul className="mt-5 space-y-3">
                {[
                  ["/work", d.nav.work],
                  ["/services", d.nav.services],
                  ["/agency", d.nav.agency],
                  ["/careers", d.nav.careers],
                  ["/contact", d.nav.contact],
                ].map(([href, label]) => (
                  <li key={href}>
                    <Link href={localeHref(locale, href)} className="link-underline text-chalk/85 hover:text-chalk">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="mono-label text-ash">{d.footer.contact}</h2>
              <ul className="mt-5 space-y-3 text-chalk/85">
                {contact.whatsapp ? (
                  <li>
                    <a href={whatsappLink(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className="link-underline hover:text-chalk">
                      {d.footer.whatsapp} <span dir="ltr">{contact.whatsapp}</span>
                    </a>
                  </li>
                ) : null}
                {contact.phone ? (
                  <li>
                    <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="link-underline hover:text-chalk" dir="ltr">
                      {contact.phone}
                    </a>
                  </li>
                ) : null}
                {contact.email ? (
                  <li>
                    <a href={`mailto:${contact.email}`} className="link-underline break-all hover:text-chalk">
                      {contact.email}
                    </a>
                  </li>
                ) : null}
                {address ? (
                  <li className="text-smoke">
                    {contact.mapUrl ? (
                      <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className="link-underline hover:text-chalk">
                        {address}
                      </a>
                    ) : (
                      address
                    )}
                  </li>
                ) : null}
                {hours ? <li className="text-smoke">{hours}</li> : null}
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              {socials.length ? (
                <>
                  <h2 className="mono-label text-ash">{d.footer.follow}</h2>
                  <ul className="mt-4 flex flex-wrap gap-1">
                    {socials.map(({ key, label, Icon }) => (
                      <li key={key}>
                        <a
                          href={social[key]}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={label}
                          className="inline-flex size-11 items-center justify-center text-chalk/80 transition-colors hover:text-signal"
                        >
                          <Icon className="size-6" aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {openRoles > 0 ? (
                <Link
                  href={localeHref(locale, "/careers")}
                  className="group mt-8 flex items-center justify-between gap-3 border border-chalk/15 px-4 py-3 transition-colors hover:border-signal"
                >
                  <span>
                    <span className="block font-semibold text-chalk">{d.footer.hiring}</span>
                    <span className="mono-label text-smoke">
                      {openRoles === 1 ? d.hero.role : fmt(d.hero.roles, { n: openRoles })}
                    </span>
                  </span>
                  <span className="rec-dot shrink-0" aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-chalk/10 py-7 text-[0.86rem] text-ash sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {general.agencyName}. {d.footer.rights}
          </p>
          <Link href="/admin" className="link-underline w-fit hover:text-chalk" prefetch={false}>
            {d.footer.team}
          </Link>
        </div>
      </div>
    </footer>
  );
}
