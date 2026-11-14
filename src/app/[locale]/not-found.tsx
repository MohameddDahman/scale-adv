import Link from "next/link";
import { localeHref } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/server";

export default async function NotFound() {
  const { locale, d } = await getDictionary();
  return (
    <section className="container-site flex min-h-[70vh] flex-col justify-center py-24">
      <span className="adv-tab w-fit">
        <span>{d.notFound.tab}</span>
      </span>
      <h1 className="display mt-6 text-[clamp(6rem,24vw,18rem)] text-chalk">{d.notFound.title}</h1>
      <p className="mt-6 max-w-[40ch] text-[1.15rem] text-smoke">{d.notFound.body}</p>
      <Link href={localeHref(locale, "/")} className="btn btn-signal mt-10 w-fit">
        {d.notFound.home}
      </Link>
    </section>
  );
}
