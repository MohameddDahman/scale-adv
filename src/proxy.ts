import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["en", "ar"] as const;
type Locale = (typeof LOCALES)[number];

/** Picks en/ar from Accept-Language, honouring q-values. */
function fromHeader(header: string | null): Locale {
  if (!header) return "en";
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    if (tag.startsWith("ar")) return "ar";
    if (tag.startsWith("en")) return "en";
  }
  return "en";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  if ((LOCALES as readonly string[]).includes(first)) return NextResponse.next();

  const cookie = request.cookies.get("NEXT_LOCALE")?.value;
  const locale: Locale = cookie === "ar" || cookie === "en" ? cookie : fromHeader(request.headers.get("accept-language"));

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next internals, API routes, the dashboard and files with an extension.
  matcher: ["/((?!_next|api|admin|.*\\..*).*)"],
};
