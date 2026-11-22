"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight, InstagramLogo, Play, SpeakerHigh, SpeakerSlash, X } from "@phosphor-icons/react";
import { Dialog } from "radix-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicReel } from "@convex/lib/shape";
import { cn, formatCompact, platformOf } from "@/lib/format";
import { fmt, tx, type Dictionary, type Locale } from "@/lib/i18n";
import { optimizedSrc } from "@/lib/image-url";
import { Media } from "./Media";

type Labels = Dictionary["work"];

export function ReelGrid({
  reels,
  locale,
  labels,
  instagram,
  filters = false,
  columns = "default",
}: {
  reels: PublicReel[];
  locale: Locale;
  labels: Labels;
  instagram?: string;
  filters?: boolean;
  columns?: "default" | "wide";
}) {
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState<number | null>(null);

  // Content / Production when reels have a type; otherwise by format (POV, Skit…).
  const byCategory = useMemo(() => reels.some((r) => r.category), [reels]);
  const keyOf = useCallback((r: PublicReel) => (byCategory ? (r.category ?? "") : r.format), [byCategory]);
  const keys = useMemo(() => [...new Set(reels.map(keyOf))].filter(Boolean), [reels, keyOf]);
  // Falls back to the key itself if a cached page still has older labels.
  const nameOf = (k: string) =>
    (byCategory ? labels.categories?.[k] : labels.formats?.[k]) ?? k.charAt(0).toUpperCase() + k.slice(1);
  const visible = useMemo(() => (filter === "all" ? reels : reels.filter((r) => keyOf(r) === filter)), [reels, filter, keyOf]);

  /* Phones: a swipeable slideshow with arrows and a "2 / 8" counter. Wider screens: the grid. */
  const listRef = useRef<HTMLUListElement>(null);
  const slideCount = visible.length + (instagram ? 1 : 0);
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () => {
      const first = el.querySelector("li");
      const step = first ? first.getBoundingClientRect().width + 12 : el.clientWidth;
      setSlide(Math.min(slideCount - 1, Math.round(Math.abs(el.scrollLeft) / step))); // RTL scrolls in negative numbers
    };
    el.scrollTo({ left: 0 });
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    return () => el.removeEventListener("scroll", measure);
  }, [slideCount, filter]);
  const moveTo = (i: number) => {
    const el = listRef.current;
    const target = el?.querySelectorAll("li")[Math.max(0, Math.min(slideCount - 1, i))];
    if (!el || !target) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const offset = rtl ? el.getBoundingClientRect().right - target.getBoundingClientRect().right : target.getBoundingClientRect().left - el.getBoundingClientRect().left;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: rtl ? -offset + 16 : offset - 16, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <>
      {filters && keys.length > 1 ? (
        <div role="group" aria-label="Filter" className="mb-8 flex flex-wrap gap-2">
          {["all", ...keys].map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "min-h-11 border px-4 text-[0.92rem] font-medium transition-colors",
                filter === f ? "border-chalk bg-chalk text-ink-950" : "border-chalk/20 text-chalk/80 hover:border-chalk/50",
              )}
            >
              {f === "all" ? labels.filterAll : nameOf(f)}
              {f !== "all" ? <span className="ms-2 font-mono text-[0.75rem] opacity-60">{reels.filter((r) => keyOf(r) === f).length}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      <ul
        ref={listRef}
        className={cn(
          "reel-rail grid gap-3 sm:gap-4",
          columns === "wide" ? "md:grid-cols-3 xl:grid-cols-4" : "md:grid-cols-3 lg:grid-cols-4",
        )}
      >
        {visible.map((reel, i) => (
          <li key={reel.id}>
            <ReelCard reel={reel} locale={locale} labels={labels} onOpen={() => setOpen(i)} />
          </li>
        ))}
        {instagram ? (
          <li>
            <a
              href={instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="on-signal group flex aspect-[9/16] flex-col justify-between bg-signal p-4 text-ink-950 transition-colors hover:bg-signal-300 sm:p-5"
            >
              <InstagramLogo className="size-8" weight="bold" aria-hidden />
              <span>
                <span className="heading block text-[clamp(1.5rem,2.6vw,2.2rem)] text-ink-950">{labels.more}</span>
                <span className="mt-3 flex items-center justify-between font-mono text-[0.8rem] font-semibold" dir="ltr">
                  {labels.moreHandle}
                  <ArrowUpRight className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </span>
              </span>
            </a>
          </li>
        ) : null}
      </ul>

      {slideCount > 1 ? (
        <div className="mt-5 flex items-center justify-between gap-4 md:hidden">
          <button type="button" className="shelf-btn" onClick={() => moveTo(slide - 1)} disabled={slide === 0} aria-label={labels.prev}>
            <ArrowLeft className="size-5 rtl:-scale-x-100" aria-hidden />
          </button>
          <span className="mono-label text-smoke" dir="ltr" aria-live="polite">
            {slide + 1} / {slideCount}
          </span>
          <button type="button" className="shelf-btn" onClick={() => moveTo(slide + 1)} disabled={slide >= slideCount - 1} aria-label={labels.next}>
            <ArrowRight className="size-5 rtl:-scale-x-100" aria-hidden />
          </button>
        </div>
      ) : null}

      <ReelViewer reels={visible} index={open} onIndex={setOpen} locale={locale} labels={labels} />
    </>
  );
}

function ReelCard({
  reel,
  locale,
  labels,
  onOpen,
}: {
  reel: PublicReel;
  locale: Locale;
  labels: Labels;
  onOpen: () => void;
}) {
  // No hover previews: each one would download the video from Cloudinary and eat into the free plan.
  const title = tx(reel.title, locale);
  const client = reel.client ? tx(reel.client, locale) : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="viewfinder group relative block aspect-[9/16] w-full cursor-pointer overflow-hidden bg-ink-800 text-start"
      aria-label={`${labels.watch}: ${title}`}
    >
      {reel.poster ? (
        <Media
          src={reel.poster}
          alt=""
          sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 48vw"
          className="object-cover transition-transform duration-700 ease-[var(--ease-out-quart)] group-hover:scale-[1.04]"
        />
      ) : (
        <span className="absolute inset-0 bg-[radial-gradient(120%_70%_at_20%_10%,rgb(255_91_31/0.35),transparent_60%)]" />
      )}
      <span className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink-950/95 via-ink-950/40 to-transparent" aria-hidden />
      <span className="adv-tab absolute start-3 top-3 !text-[0.6rem]">
        <span>{labels.formats[reel.format] ?? reel.format}</span>
      </span>
      <span className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4">
        <span className="line-clamp-2 block text-[0.98rem] font-semibold leading-snug text-chalk sm:text-[1.05rem]">{title}</span>
        <span className="mt-1.5 flex items-center justify-between gap-2 text-[0.78rem] text-smoke">
          <span className="truncate">{client ?? "SCALE ADV"}</span>
          {reel.views ? (
            <span className="shrink-0 font-mono tabular">
              {formatCompact(reel.views, locale)} {labels.views}
            </span>
          ) : null}
        </span>
      </span>
      <span
        className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 scale-90 place-items-center rounded-full bg-signal text-ink-950 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
        aria-hidden
      >
        <Play weight="fill" className="size-6" />
      </span>
    </button>
  );
}

function ReelViewer({
  reels,
  index,
  onIndex,
  locale,
  labels,
}: {
  reels: PublicReel[];
  index: number | null;
  onIndex: (i: number | null) => void;
  locale: Locale;
  labels: Labels;
}) {
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reel = index !== null ? reels[index] : null;
  const count = reels.length;

  const go = useCallback(
    (delta: number) => {
      if (index === null || count === 0) return;
      onIndex((index + delta + count) % count);
    },
    [index, count, onIndex],
  );

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, index]);

  const rtl = locale === "ar";
  const Prev = rtl ? ArrowRight : ArrowLeft;
  const Next = rtl ? ArrowLeft : ArrowRight;
  const title = reel ? tx(reel.title, locale) : "";
  const platform = platformOf(reel?.link ?? null);

  return (
    <Dialog.Root open={reel !== null} onOpenChange={(o) => !o && onIndex(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink-950/95 backdrop-blur-sm" />
        <Dialog.Content
          dir={rtl ? "rtl" : "ltr"}
          lang={locale}
          className="site fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-4 outline-none sm:p-8"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(rtl ? -1 : 1);
            if (e.key === "ArrowLeft") go(rtl ? 1 : -1);
          }}
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {reel ? (
            <>
              <div className="flex w-full max-w-5xl items-center justify-between">
                <span className="mono-label text-smoke" dir="ltr">
                  {fmt(labels.of, { i: (index ?? 0) + 1, n: count })}
                </span>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-2 px-3 text-chalk transition-colors hover:text-signal"
                  >
                    {labels.close}
                    <X className="size-5" weight="bold" aria-hidden />
                  </button>
                </Dialog.Close>
              </div>

              <div className="flex min-h-0 w-full max-w-5xl flex-1 items-center justify-center gap-3 sm:gap-6">
                {count > 1 ? (
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label={labels.prev}
                    className="hidden size-12 shrink-0 place-items-center border border-chalk/20 text-chalk transition-colors hover:border-signal hover:text-signal sm:grid"
                  >
                    <Prev className="size-5" aria-hidden />
                  </button>
                ) : null}

                <div className="relative aspect-[9/16] h-full max-h-full max-w-full overflow-hidden bg-ink-900">
                  {reel.video ? (
                    <video
                      key={reel.id}
                      ref={videoRef}
                      src={reel.video}
                      poster={reel.poster ? optimizedSrc(reel.poster, 828) : undefined}
                      controls
                      autoPlay
                      playsInline
                      className="size-full bg-black object-contain"
                    />
                  ) : reel.embed ? (
                    <iframe
                      key={reel.id}
                      src={reel.embed}
                      title={title}
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="size-full"
                    />
                  ) : (
                    <>
                      {reel.poster ? <Media src={reel.poster} alt={title} sizes="50vh" className="object-cover" /> : null}
                      <div className="absolute inset-0 flex flex-col items-center justify-end gap-4 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent p-6 text-center">
                        <p className="max-w-[26ch] text-[0.95rem] text-chalk/90">{labels.noVideo}</p>
                        {reel.link ? (
                          <a href={reel.link} target="_blank" rel="noopener noreferrer" className="btn btn-signal">
                            {fmt(labels.openOn, { platform })}
                            <ArrowUpRight className="size-4" aria-hidden />
                          </a>
                        ) : null}
                      </div>
                    </>
                  )}
                  {reel.video ? (
                    <button
                      type="button"
                      onClick={() => setMuted((m) => !m)}
                      aria-label={muted ? labels.unmute : labels.mute}
                      className="absolute end-3 top-3 grid size-11 place-items-center rounded-full bg-ink-950/70 text-chalk"
                    >
                      {muted ? <SpeakerSlash className="size-5" aria-hidden /> : <SpeakerHigh className="size-5" aria-hidden />}
                    </button>
                  ) : null}
                </div>

                {count > 1 ? (
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label={labels.next}
                    className="hidden size-12 shrink-0 place-items-center border border-chalk/20 text-chalk transition-colors hover:border-signal hover:text-signal sm:grid"
                  >
                    <Next className="size-5" aria-hidden />
                  </button>
                ) : null}
              </div>

              <div className="flex w-full max-w-5xl flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <span className="adv-tab !text-[0.6rem]">
                    <span>{labels.formats[reel.format] ?? reel.format}</span>
                  </span>
                  <p className="mt-2 text-[1.1rem] font-semibold text-chalk">{title}</p>
                  {reel.client ? <p className="text-[0.9rem] text-smoke">{tx(reel.client, locale)}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  {count > 1 ? (
                    <>
                      <button type="button" onClick={() => go(-1)} aria-label={labels.prev} className="grid size-11 place-items-center border border-chalk/20 sm:hidden">
                        <Prev className="size-5" aria-hidden />
                      </button>
                      <button type="button" onClick={() => go(1)} aria-label={labels.next} className="grid size-11 place-items-center border border-chalk/20 sm:hidden">
                        <Next className="size-5" aria-hidden />
                      </button>
                    </>
                  ) : null}
                  {reel.link && (reel.video || reel.embed) ? (
                    <a href={reel.link} target="_blank" rel="noopener noreferrer" className="btn btn-line !min-h-11">
                      {fmt(labels.openOn, { platform })}
                      <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
