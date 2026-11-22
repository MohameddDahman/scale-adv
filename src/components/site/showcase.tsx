"use client";

import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { PublicClient } from "@convex/lib/shape";
import { cn, formatCompact } from "@/lib/format";
import { fmt, tx, type Locale } from "@/lib/i18n";
import { Media } from "./Media";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Runs `fn` once the opening intro has finished (straight away when there isn't one). */
export function whenIntroDone(fn: () => void) {
  if (document.documentElement.dataset.intro !== "play") {
    fn();
    return () => {};
  }
  const done = () => fn();
  window.addEventListener("scale:intro-done", done, { once: true });
  return () => window.removeEventListener("scale:intro-done", done);
}

/* ------------------------------------------------------------------ */
/* CountUp: "518K+" counts up from zero when the page opens (or when   */
/* it scrolls into view). Server-rendered with the final value, so it  */
/* reads right without JavaScript; with JavaScript it's hidden until   */
/* it starts counting (see .count-up in globals.css).                  */
/* ------------------------------------------------------------------ */

export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  // Before paint, so a page opened from a link never flashes the final number first.
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const match = /^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/.exec(value);
    if (!match || reducedMotion()) {
      setShown(value);
      el.dataset.counted = "";
      return;
    }
    const [, before, digits, after] = match;
    const target = Number(digits.replace(/,/g, ""));
    const decimals = (digits.split(".")[1] ?? "").length;
    const at = (n: number) => `${before}${n.toFixed(decimals)}${after}`;
    setShown(at(0));
    el.dataset.counted = "";

    let frame = 0;
    let stopIntro = () => {};
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1700);
        setShown(p < 1 ? at(target * (1 - Math.pow(1 - p, 3))) : value);
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        stopIntro = whenIntroDone(run);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stopIntro();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className={cn("count-up", className)}>
      {shown}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* BrandWall: the client roster as social profiles, filterable.        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* BrandSlider: every brand on a strip that slides by itself, so the   */
/* whole roster fits in one row. Pauses under a finger, the mouse or    */
/* keyboard focus; with reduced motion it's a row you swipe instead.    */
/* ------------------------------------------------------------------ */

export function BrandSlider({
  clients,
  locale,
  labels,
}: {
  clients: PublicClient[];
  locale: Locale;
  labels: { followers: string; visit: string; slider: string };
}) {
  // Two copies back to back: sliding by exactly one copy's width loops without a jump.
  const loop = clients.length > 2;
  const slides = loop ? [...clients, ...clients] : clients;
  return (
    <div className={cn("brand-marquee", !loop && "brand-marquee--still")} role="region" aria-label={labels.slider}>
      <ul className="brand-track" style={{ "--duration": `${Math.max(28, clients.length * 4.5)}s` } as CSSProperties}>
        {slides.map((c, i) => {
          const copy = i >= clients.length;
          const name = tx(c.name, locale);
          const inner = (
            <>
              <span className="brand-avatar">
                <span className="brand-ring" aria-hidden />
                <span className="brand-logo">
                  {c.logo ? (
                    <Media src={c.logo} alt="" sizes="96px" className="object-cover" />
                  ) : (
                    <span className="heading grid size-full place-items-center text-3xl text-chalk">{name.slice(0, 1)}</span>
                  )}
                </span>
              </span>
              <span className="brand-name">{name}</span>
              <span className="brand-meta">{tx(c.industry, locale)}</span>
              {c.followers ? (
                <span className="brand-followers">
                  <span className="text-chalk" dir="ltr">
                    {formatCompact(c.followers, locale)}
                  </span>{" "}
                  {labels.followers}
                </span>
              ) : null}
            </>
          );
          return (
            <li key={`${c.id}-${copy ? "b" : "a"}`} className="brand-slide" aria-hidden={copy || undefined}>
              {c.link ? (
                <a
                  href={c.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="brand-card"
                  aria-label={fmt(labels.visit, { name })}
                  tabIndex={copy ? -1 : undefined}
                >
                  {inner}
                </a>
              ) : (
                <div className="brand-card">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ProcessScrub: a playhead runs down the steps as the section scrolls. */
/* ------------------------------------------------------------------ */

export function ProcessScrub({ steps, nowLabel }: { steps: { title: string; body: string }[]; nowLabel: string }) {
  const listRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (reducedMotion()) {
      el.style.setProperty("--progress", "1");
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const line = window.innerHeight * 0.55; // the "playhead" sits a little above the middle of the screen
      const progress = Math.min(1, Math.max(0, (line - rect.top) / rect.height));
      el.style.setProperty("--progress", progress.toFixed(4));
      setActive(Math.min(steps.length - 1, Math.floor(progress * steps.length)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [steps.length]);

  return (
    <div className="process">
      <div className="process-counter" aria-hidden>
        <span className="mono-label text-signal">{nowLabel}</span>
        <span className="display process-now" dir="ltr">
          {String(active + 1).padStart(2, "0")}
          <span className="text-chalk/25">/{String(steps.length).padStart(2, "0")}</span>
        </span>
        <span className="process-now-title">{steps[active]?.title}</span>
      </div>
      <ol ref={listRef} className="process-list">
        {steps.map((step, i) => (
          <li key={i} className="process-step" data-state={i < active ? "done" : i === active ? "active" : "next"}>
            <span className="process-num" dir="ltr">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="process-title">{step.title}</h3>
              <p className="process-body">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FormatShelf: a swipeable shelf of reel formats.                     */
/* ------------------------------------------------------------------ */

export type FormatCard = { key: string; name: string; line: string; best: string; length: string; still: string | null };

export function FormatShelf({ items, labels }: { items: FormatCard[]; labels: { prev: string; next: string; bestFor: string; length: string } }) {
  const shelf = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState<{ start: boolean; end: boolean }>({ start: true, end: false });

  useEffect(() => {
    const el = shelf.current;
    if (!el) return;
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      const pos = Math.abs(el.scrollLeft); // RTL scrolls in negative numbers
      setEdge({ start: pos < 8, end: pos > max - 8 });
    };
    const frame = requestAnimationFrame(measure);
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const move = (dir: 1 | -1) => {
    const el = shelf.current;
    if (!el) return;
    const card = el.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 12 : 280;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: dir * step * 2 * (rtl ? -1 : 1), behavior: reducedMotion() ? "auto" : "smooth" });
  };

  return (
    <div>
      <div className="mb-6 flex justify-end gap-2">
        <button type="button" className="shelf-btn" onClick={() => move(-1)} disabled={edge.start} aria-label={labels.prev}>
          <ArrowLeft className="size-5 rtl:-scale-x-100" aria-hidden />
        </button>
        <button type="button" className="shelf-btn" onClick={() => move(1)} disabled={edge.end} aria-label={labels.next}>
          <ArrowRight className="size-5 rtl:-scale-x-100" aria-hidden />
        </button>
      </div>
      <ul ref={shelf} className="format-shelf">
        {items.map((f) => (
          <li key={f.key} className="format-card viewfinder">
            <span className={cn("format-bg", !f.still && "format-bg--empty")} aria-hidden>
              {f.still ? <Media src={f.still} alt="" sizes="(min-width: 768px) 280px, 70vw" className="object-cover" /> : null}
            </span>
            <span className="format-top">
              <span className="rec-dot" aria-hidden />
              <span className="font-mono text-[0.7rem] tracking-[0.12em]" dir="ltr" title={labels.length}>
                {f.length}
              </span>
            </span>
            <div className="format-copy">
              <h3
                className="format-name"
                // Font size scales with the longest word so STORYTELLING fits the card.
                style={{ "--fit": (1 / (Math.max(...f.name.split(/\s+/).map((w) => w.length)) * 0.78)).toFixed(4) } as CSSProperties}
              >
                {f.name}
              </h3>
              <p className="format-line">{f.line}</p>
              <p className="format-best">
                <span className="mono-label text-signal">{labels.bestFor}</span> {f.best}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
