"use client";

import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { PublicClient } from "@convex/lib/shape";
import { cn, formatCompact } from "@/lib/format";
import { fmt, tx, type Locale } from "@/lib/i18n";
import { Media } from "./Media";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* CountUp: "518K+" counts up from zero the first time it scrolls in.  */
/* Server-rendered with the final value, so it reads right without JS. */
/* ------------------------------------------------------------------ */

export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState({ value, shown: value });
  if (state.value !== value) setState({ value, shown: value });

  useEffect(() => {
    const el = ref.current;
    const match = /^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/.exec(value);
    if (!el || !match || reducedMotion()) return;
    // Only numbers that start below the fold count up; anything already on screen stays put.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    const [, before, digits, after] = match;
    const target = Number(digits.replace(/,/g, ""));
    const decimals = (digits.split(".")[1] ?? "").length;
    const show = (text: string) => setState({ value, shown: text });
    const at = (n: number) => `${before}${n.toFixed(decimals)}${after}`;
    let frame = requestAnimationFrame(() => show(at(0)));
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        cancelAnimationFrame(frame);
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / 1400);
          show(p < 1 ? at(target * (1 - Math.pow(1 - p, 3))) : value);
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {state.shown}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* BrandWall: the client roster as social profiles, filterable.        */
/* ------------------------------------------------------------------ */

const GROUPS: { key: string; match: RegExp }[] = [
  { key: "fashion", match: /wear|fashion|cloth|apparel|boutique/i },
  { key: "home", match: /home|furnish|furniture|decor|mattress/i },
  { key: "realestate", match: /real estate|construction|propert|develop/i },
  { key: "health", match: /supplement|health|pharma|beauty|clinic/i },
];
const groupOf = (c: PublicClient) => GROUPS.find((g) => g.match.test(`${c.industry.en} ${c.name.en}`))?.key ?? "other";

export function BrandWall({
  clients,
  locale,
  labels,
}: {
  clients: PublicClient[];
  locale: Locale;
  labels: { filterLabel: string; filterAll: string; groups: Record<string, string>; followers: string; visit: string };
}) {
  const [filter, setFilter] = useState("all");
  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of clients) counts.set(groupOf(c), (counts.get(groupOf(c)) ?? 0) + 1);
    return GROUPS.filter((g) => (counts.get(g.key) ?? 0) > 0).map((g) => ({ key: g.key, count: counts.get(g.key) ?? 0 }));
  }, [clients]);
  const shown = filter === "all" ? clients : clients.filter((c) => groupOf(c) === filter);

  return (
    <div>
      {groups.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label={labels.filterLabel}>
          {[{ key: "all", count: clients.length }, ...groups].map((g) => (
            <button
              key={g.key}
              type="button"
              aria-pressed={filter === g.key}
              onClick={() => setFilter(g.key)}
              className="chip-toggle aria-pressed:border-chalk aria-pressed:bg-chalk aria-pressed:text-ink-950"
            >
              {g.key === "all" ? labels.filterAll : (labels.groups[g.key] ?? g.key)}
              <span className="font-mono text-[0.72rem] opacity-60" dir="ltr">
                {g.count}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <ul className="brand-wall mt-8" key={filter}>
        {shown.map((c, i) => {
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
              {tx(c.city, locale) ? <span className="brand-city">{tx(c.city, locale)}</span> : null}
            </>
          );
          return (
            <li key={c.id} className="brand-tile" style={{ "--i": i } as CSSProperties}>
              {c.link ? (
                <a href={c.link} target="_blank" rel="noopener noreferrer" className="brand-card" aria-label={fmt(labels.visit, { name })}>
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
