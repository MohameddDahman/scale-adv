"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";
import type { Locale } from "@/lib/i18n";

export function LanguageSwitch({
  locale,
  label,
  ariaLabel,
  className,
}: {
  locale: Locale;
  label: string;
  ariaLabel: string;
  className?: string;
}) {
  const pathname = usePathname() ?? `/${locale}`;
  const target: Locale = locale === "ar" ? "en" : "ar";
  const href = pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${target}`) || `/${target}`;

  return (
    <Link
      href={href}
      hrefLang={target}
      lang={target}
      aria-label={ariaLabel}
      onClick={() => {
        document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=31536000; samesite=lax`;
      }}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-[0.95rem] font-semibold text-chalk/85 transition-colors hover:text-signal",
        target === "ar" ? "font-[family-name:var(--font-plex-arabic)]" : "font-[family-name:var(--font-mona)]",
        className,
      )}
    >
      {label}
    </Link>
  );
}
