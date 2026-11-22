"use client";

import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { PublicClient } from "@convex/lib/shape";
import { cn, shortDown } from "@/lib/format";
import { tx, type Locale } from "@/lib/i18n";
import { Media } from "./Media";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const UNIT: Record<string, number> = { K: 1_000, M: 1_000_000, B: 1_000_000_000 };
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Runs `fn` once the opening intro has finished (straight away when there isn't one). */
export function whenIntroDone(fn: () => void) {
  const intro = document.documentElement.dataset.intro;
  if (intro !== "play" && intro !== "calm") {
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
    const number = Number(digits.replace(/,/g, ""));
    // "1.8M+" counts the real number, 0 → 1,800,000, shown short all the way: 950+, 420K+, 1.2M+, 1.8M+.
    const unit = /^[KMB](?![a-z])/i.exec(after)?.[0].toUpperCase();
    const scale = unit ? UNIT[unit] : 1;
    const target = number * scale;
    const rest = unit ? after.slice(1) : after;
    const decimals = (digits.split(".")[1] ?? "").length;
    const at = (n: number) => (unit ? `${before}${shortDown(n)}${rest}` : `${before}${n.toFixed(decimals)}${after}`);
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
/* LogoMarquee: the brands' logos in one row that slides by itself.    */
/* Drag or swipe to move it, arrows on wider screens. Stops under the  */
/* mouse, on keyboard focus and off screen; with reduced motion it     */
/* only moves when someone drags it or uses the arrows.                */
/* ------------------------------------------------------------------ */

/** Sliding speed, in pixels a second. */
const LOGO_SPEED = 45;

export function LogoMarquee({
  clients,
  locale,
  caption,
  labels,
}: {
  clients: PublicClient[];
  locale: Locale;
  /** Small line above the logos (the hero). Sections with their own heading leave it out. */
  caption?: string;
  labels: { region: string; prev: string; next: string };
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLUListElement>(null);
  const nudgeRef = useRef<(towards: number) => void>(() => {});
  const [copies, setCopies] = useState(2);
  const moving = clients.length > 3;
  // Logos travel toward where reading starts: to the left in English, to the right in Arabic.
  const flow = locale === "ar" ? 1 : -1;

  useEffect(() => {
    const root = rootRef.current;
    const win = windowRef.current;
    const track = trackRef.current;
    const set = setRef.current;
    if (!moving || !root || !win || !track || !set) return;
    const still = reducedMotion();
    let width = 0; // one set of logos, its trailing gap included
    let pos = 0; // keeps counting; shown modulo one set, so the loop never jumps
    let last = 0;
    let frame = 0;
    let hover = false;
    let focused = false;
    let drag: { id: number; x: number } | null = null;
    let tween: { from: number; to: number; start: number; dur: number } | null = null;

    const paint = () => {
      const x = width ? -(((-pos % width) + width) % width) : 0;
      track.style.transform = `translate3d(${x}px,0,0)`;
    };
    const tick = (now: number) => {
      const dt = last ? Math.min(64, now - last) : 0;
      last = now;
      if (tween) {
        const p = tween.dur ? Math.min(1, (now - tween.start) / tween.dur) : 1;
        pos = tween.from + (tween.to - tween.from) * (1 - Math.pow(1 - p, 3));
        if (p >= 1) tween = null;
      } else if (!still && !hover && !focused && !drag) {
        pos += (flow * LOGO_SPEED * dt) / 1000;
      }
      paint();
      frame = requestAnimationFrame(tick);
    };
    const run = () => {
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    const halt = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const measure = () => {
      width = set.getBoundingClientRect().width;
      // Enough copies to cover the window while one copy slides out of view.
      const need = Math.max(2, Math.ceil(win.clientWidth / Math.max(width, 1)) + 1);
      setCopies((c) => (c === need ? c : need));
      paint();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(set);
    resize.observe(win);
    measure();
    const seen = new IntersectionObserver(([entry]) => (entry.isIntersecting ? run() : halt()));
    seen.observe(win);

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX };
      tween = null;
      if (e.pointerType === "mouse") win.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      pos += e.clientX - drag.x;
      drag.x = e.clientX;
    };
    const up = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) drag = null;
    };
    const enter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hover = true;
    };
    const leave = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hover = false;
    };
    const focusIn = () => {
      focused = true;
    };
    const focusOut = (e: FocusEvent) => {
      if (!root.contains(e.relatedTarget as Node | null)) focused = false;
    };
    win.addEventListener("pointerdown", down);
    win.addEventListener("pointermove", move);
    win.addEventListener("pointerup", up);
    win.addEventListener("pointercancel", up);
    win.addEventListener("pointerenter", enter);
    win.addEventListener("pointerleave", leave);
    root.addEventListener("focusin", focusIn);
    root.addEventListener("focusout", focusOut);

    nudgeRef.current = (towards) => {
      tween = { from: pos, to: pos + towards * win.clientWidth * 0.6, start: performance.now(), dur: still ? 0 : 520 };
      run();
    };

    return () => {
      halt();
      resize.disconnect();
      seen.disconnect();
      win.removeEventListener("pointerdown", down);
      win.removeEventListener("pointermove", move);
      win.removeEventListener("pointerup", up);
      win.removeEventListener("pointercancel", up);
      win.removeEventListener("pointerenter", enter);
      win.removeEventListener("pointerleave", leave);
      root.removeEventListener("focusin", focusIn);
      root.removeEventListener("focusout", focusOut);
      nudgeRef.current = () => {};
    };
  }, [moving, flow]);

  if (!clients.length) return null;
  const logos = (hidden: boolean) =>
    clients.map((c) => {
      const name = tx(c.name, locale);
      return (
        <li key={c.id} className="logo-tile">
          {c.logo ? (
            <Media src={c.logo} alt={hidden ? "" : name} sizes="64px" className="object-cover" eager />
          ) : (
            <span className="logo-initial" aria-hidden>
              {name.slice(0, 1)}
            </span>
          )}
          {!c.logo && !hidden ? <span className="sr-only">{name}</span> : null}
        </li>
      );
    });

  return (
    <div ref={rootRef} className={cn("logo-strip", !caption && "logo-strip--plain")} role="group" aria-label={labels.region}>
      {caption ? <p className="logo-strip-caption">{caption}</p> : null}
      <div className={cn("logo-marquee", !moving && "logo-marquee--still")}>
        {moving ? (
          <button type="button" className="logo-marquee-btn" onClick={() => nudgeRef.current(-flow)} aria-label={labels.prev}>
            <ArrowLeft className="size-4 rtl:-scale-x-100" weight="bold" aria-hidden />
          </button>
        ) : null}
        {/* Left to right inside, in Arabic too: the sliding maths assume the row starts at the left edge. */}
        <div ref={windowRef} className="logo-marquee-window" dir="ltr">
          <div ref={trackRef} className="logo-marquee-track">
            {Array.from({ length: moving ? copies : 1 }, (_, k) => (
              <ul key={k} ref={k === 0 ? setRef : undefined} className="logo-set" aria-hidden={k > 0 || undefined}>
                {logos(k > 0)}
              </ul>
            ))}
          </div>
        </div>
        {moving ? (
          <button type="button" className="logo-marquee-btn" onClick={() => nudgeRef.current(flow)} aria-label={labels.next}>
            <ArrowRight className="size-4 rtl:-scale-x-100" weight="bold" aria-hidden />
          </button>
        ) : null}
      </div>
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
              {f.length ? (
                <span className="font-mono text-[0.7rem] tracking-[0.12em]" dir="ltr" title={labels.length}>
                  {f.length}
                </span>
              ) : null}
            </span>
            <div className="format-copy">
              <h3
                className="format-name"
                // Font size scales with the longest word so STORYTELLING fits the card.
                style={{ "--fit": (1 / (Math.max(...f.name.split(/\s+/).map((w) => w.length)) * 0.78)).toFixed(4) } as CSSProperties}
              >
                {f.name}
              </h3>
              {f.line ? <p className="format-line">{f.line}</p> : null}
              {f.best ? (
                <p className="format-best">
                  <span className="mono-label text-signal">{labels.bestFor}</span> {f.best}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
