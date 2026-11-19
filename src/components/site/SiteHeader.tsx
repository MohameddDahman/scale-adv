"use client";

import { ArrowUpRight, List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { useEffect, useState } from "react";
import { cn } from "@/lib/format";
import { localeHref, type Dictionary, type Locale } from "@/lib/i18n";
import { BriefLink } from "./Brief";
import { LanguageSwitch } from "./LanguageSwitch";
import { Wordmark } from "./Wordmark";

type Props = {
  locale: Locale;
  nav: Dictionary["nav"];
  openRoles: number;
  announcement: { text: string; href: string } | null;
};

export function SiteHeader({ locale, nav, openRoles, announcement }: Props) {
  const pathname = usePathname() ?? "";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "/work", label: nav.work },
    { href: "/services", label: nav.services },
    { href: "/agency", label: nav.agency },
    { href: "/careers", label: nav.careers, badge: openRoles },
    { href: "/contact", label: nav.contact },
  ];
  const isActive = (href: string) => {
    const full = localeHref(locale, href);
    return pathname === full || pathname.startsWith(`${full}/`);
  };
  const announcementHref = announcement?.href.startsWith("/") ? localeHref(locale, announcement.href) : announcement?.href;

  return (
    <>
      {announcement ? (
        <div className="bg-signal text-ink-950">
          <Link
            href={announcementHref ?? "#"}
            className="container-site flex min-h-10 items-center justify-center gap-2 py-2 text-center text-[0.86rem] font-semibold"
          >
            {announcement.text}
            <ArrowUpRight aria-hidden className="size-4 rtl:-scale-x-100" weight="bold" />
          </Link>
        </div>
      ) : null}

      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-[background-color,border-color] duration-300",
          scrolled ? "border-chalk/10 bg-ink-950/88 backdrop-blur-md" : "border-transparent bg-ink-950/0",
        )}
      >
        <div className="container-site flex h-16 items-center justify-between gap-4 md:h-[4.75rem]">
          <Link href={localeHref(locale, "/")} aria-label={nav.home} className="text-[1.6rem] md:text-[1.85rem]">
            <Wordmark />
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {links.map((link) => {
                const active = isActive(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={localeHref(locale, link.href)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative inline-flex min-h-11 items-center gap-2 text-[0.95rem] font-medium transition-colors",
                        active ? "text-chalk" : "text-chalk/70 hover:text-chalk",
                      )}
                    >
                      {link.label}
                      {link.badge ? (
                        <span className="adv-tab !px-[0.45em] !py-[0.3em] !text-[0.62rem]" aria-label={`${link.badge}`}>
                          <span>{link.badge}</span>
                        </span>
                      ) : null}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-x-0 bottom-1 h-[2px] origin-left -skew-x-[14deg] bg-signal transition-transform duration-300 rtl:origin-right",
                          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1 sm:gap-3">
            <LanguageSwitch locale={locale} label={nav.switchTo} ariaLabel={nav.switchLabel} />
            <BriefLink className="btn btn-signal hidden !min-h-11 !px-5 sm:inline-flex">{nav.start}</BriefLink>
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 text-chalk lg:hidden"
                  aria-label={nav.menu}
                >
                  <List className="size-6" weight="bold" aria-hidden />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-ink-950/70 backdrop-blur-sm data-[state=open]:animate-[rise_.25s_ease-out]" />
                <Dialog.Content
                  dir={locale === "ar" ? "rtl" : "ltr"}
                  lang={locale}
                  className="site fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ink-950 data-[state=open]:animate-[rise_.3s_var(--ease-out-quart)]"
                >
                  <Dialog.Title className="sr-only">{nav.menu}</Dialog.Title>
                  <Dialog.Description className="sr-only">SCALE ADV</Dialog.Description>
                  <div className="container-site flex h-16 items-center justify-between">
                    <span className="text-[1.6rem]">
                      <Wordmark />
                    </span>
                    <Dialog.Close asChild>
                      <button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center text-chalk" aria-label={nav.close}>
                        <X className="size-6" weight="bold" aria-hidden />
                      </button>
                    </Dialog.Close>
                  </div>
                  <nav aria-label="Main" className="container-site mt-6 flex-1">
                    <ul className="divide-y divide-chalk/10 border-y border-chalk/10">
                      {links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={localeHref(locale, link.href)}
                            onClick={() => setOpen(false)}
                            aria-current={isActive(link.href) ? "page" : undefined}
                            className="heading flex min-h-[4.5rem] items-center justify-between text-[2.4rem] text-chalk aria-[current=page]:text-signal"
                          >
                            {link.label}
                            {link.badge ? (
                              <span className="adv-tab">
                                <span>{link.badge}</span>
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  <div className="container-site flex flex-col gap-3 py-8">
                    <BriefLink onOpen={() => setOpen(false)} className="btn btn-signal w-full">
                      {nav.start}
                    </BriefLink>
                    <LanguageSwitch locale={locale} label={nav.switchTo} ariaLabel={nav.switchLabel} className="btn btn-line w-full" />
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </header>
    </>
  );
}
