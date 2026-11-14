"use client";

import { ArrowCounterClockwise, Pause, Play } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";

type Labels = Dictionary["hero"]["timeline"];

const LENGTH = 30; // seconds of reel
const PLAY_MS = 12_000; // real time for one pass
const FPS = 30;
const CELLS = 56;
const BARS = 140;

const pad = (n: number) => String(n).padStart(2, "0");

/** Deterministic pseudo-random waveform so server and client render the same path. */
function wavePath(bars: number, seed = 7) {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const w = 1000 / bars;
  let d = "";
  for (let i = 0; i < bars; i++) {
    const t = i / bars;
    // louder through the story, a dip before the CTA, punchy hook
    const envelope = t < 0.1 ? 0.95 : t < 0.4 ? 0.7 : t < 0.66 ? 0.55 : t < 0.86 ? 0.75 : 0.9;
    const h = Math.max(0.08, envelope * (0.35 + rand() * 0.65));
    const x = i * w + w * 0.2;
    const y = 50 - h * 48;
    d += `M${x.toFixed(1)} ${y.toFixed(1)}h${(w * 0.6).toFixed(1)}v${(h * 96).toFixed(1)}h${(-w * 0.6).toFixed(1)}z`;
  }
  return d;
}

export function HeroTimeline({ labels, frames, locale }: { labels: Labels; frames: string[]; locale: Locale }) {
  const segments = labels.segments;
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);

  const laneRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const litRef = useRef<SVGSVGElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);
  const progress = useRef(0);
  const width = useRef(0);
  const raf = useRef<number | null>(null);
  const activeRef = useRef(0);

  const wave = useMemo(() => wavePath(BARS), []);

  const paint = useCallback(
    (p: number) => {
      progress.current = p;
      if (headRef.current) headRef.current.style.transform = `translateX(${(p * width.current).toFixed(2)}px)`;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
      if (litRef.current) litRef.current.style.clipPath = `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0)`;
      const seconds = p * LENGTH;
      if (tcRef.current) {
        const s = Math.min(LENGTH, Math.floor(seconds));
        const f = p >= 1 ? 0 : Math.floor((seconds % 1) * FPS);
        tcRef.current.textContent = `00:00:${pad(s)}:${pad(f)}`;
      }
      const idx = Math.max(
        0,
        segments.findIndex((seg) => seconds >= seg.start && seconds < seg.end),
      );
      const next = p >= 1 ? segments.length - 1 : idx;
      if (next !== activeRef.current) {
        activeRef.current = next;
        setActive(next);
      }
    },
    [segments],
  );

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    const from = progress.current >= 1 ? 0 : progress.current;
    const start = performance.now() - from * PLAY_MS;
    setPlaying(true);
    setEnded(false);
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / PLAY_MS);
      paint(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else {
        raf.current = null;
        setPlaying(false);
        setEnded(true);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, [paint]);

  // Measure the lane so the playhead can move with transforms only.
  useEffect(() => {
    const lane = laneRef.current;
    if (!lane) return;
    const ro = new ResizeObserver(([entry]) => {
      width.current = entry.contentRect.width;
      paint(progress.current);
    });
    ro.observe(lane);
    return () => ro.disconnect();
  }, [paint]);

  // Autoplay once when the timeline scrolls into view, unless motion is reduced.
  useEffect(() => {
    const lane = laneRef.current;
    if (!lane) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      paint(0.02);
      return;
    }
    let started = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          window.setTimeout(play, 500);
        }
        if (!entry.isIntersecting && raf.current !== null) stop();
      },
      { threshold: 0.4 },
    );
    io.observe(lane);
    return () => {
      io.disconnect();
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [paint, play, stop]);

  const seekTo = (i: number) => {
    stop();
    setEnded(false);
    paint(segments[i].start / LENGTH + 0.001);
    activeRef.current = i;
    setActive(i);
  };

  const current = segments[active];
  const marks = [0, 5, 10, 15, 20, 25, 30];
  const ToggleIcon = playing ? Pause : ended ? ArrowCounterClockwise : Play;
  const toggleLabel = playing ? labels.pause : ended ? labels.replay : labels.play;

  return (
    <figure className="tl" aria-label={labels.title}>
      <div className="tl-toolbar">
        <span className={`tl-title mono-label`}>
          <span className="rec-dot" aria-hidden />
          {labels.title}
        </span>
        <span ref={tcRef} className="tl-timecode" aria-hidden>
          00:00:00:00
        </span>
        <button
          type="button"
          className="tl-play"
          onClick={() => (playing ? stop() : play())}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          <ToggleIcon weight="fill" className="size-5" aria-hidden />
        </button>
        <span className="tl-spec">{labels.spec}</span>
      </div>

      <div className="tl-body">
        <div className="tl-monitor" aria-hidden>
          <div className="tl-screen">
            {frames.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src + i}
                src={src}
                alt=""
                className="tl-frame"
                data-active={i === active % frames.length}
                loading="lazy"
                decoding="async"
              />
            ))}
            <span className="tl-rec">
              <span className="rec-dot" /> REC
            </span>
            <span className="tl-caption" lang={locale}>
              {current.label}
            </span>
          </div>
        </div>

        <div className="tl-tracks" dir="ltr">
          <div className="tl-row">
            <span className="tl-track-label" />
            <div className={`tl-lane tl-ruler`} aria-hidden>
              {marks.map((m) => (
                <span key={m} className="tl-mark" style={{ left: `${(m / LENGTH) * 100}%` }}>
                  {m}s
                </span>
              ))}
            </div>
          </div>

          <div className="tl-row">
            <span className="tl-track-label" lang={locale}>
              V2 · {labels.tracks.beats}
            </span>
            <div className="tl-lane">
              <div className="tl-render" aria-hidden>
                <div ref={fillRef} className="tl-render-fill" />
              </div>
              <div className="tl-beats" role="group" aria-label={labels.title}>
                {segments.map((seg, i) => (
                  <button
                    key={seg.key}
                    type="button"
                    className="tl-clip"
                    style={{
                      left: `${(seg.start / LENGTH) * 100}%`,
                      width: `calc(${((seg.end - seg.start) / LENGTH) * 100}% - 2px)`,
                    }}
                    data-state={i === active ? "active" : i < active ? "passed" : "idle"}
                    aria-pressed={i === active}
                    aria-label={`${seg.label}, ${seg.range}: ${seg.body}`}
                    onClick={() => seekTo(i)}
                  >
                    <span className="tl-clip-label" lang={locale}>
                      {seg.label}
                    </span>
                    <span className="tl-clip-range">{seg.range}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="tl-row" aria-hidden>
            <span className="tl-track-label" lang={locale}>
              V1 · {labels.tracks.picture}
            </span>
            <div className="tl-lane">
              <div className="tl-picture">
                {Array.from({ length: CELLS }, (_, i) => {
                  const src = frames.length ? frames[Math.floor(i / 4) % frames.length] : null;
                  return (
                    <span
                      key={i}
                      className={`tl-cell ${src ? "" : "tl-cell-empty"}`}
                      style={src ? { backgroundImage: `url("${src}")` } : undefined}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="tl-row" aria-hidden>
            <span className="tl-track-label" lang={locale}>
              A1 · {labels.tracks.sound}
            </span>
            <div className="tl-lane">
              <div className="tl-sound">
                <svg className="tl-wave" viewBox="0 0 1000 100" preserveAspectRatio="none">
                  <path d={wave} fill="rgb(243 240 235 / 0.28)" />
                </svg>
                <svg ref={litRef} className={`tl-wave tl-wave-lit`} viewBox="0 0 1000 100" preserveAspectRatio="none">
                  <path d={wave} fill="var(--color-signal)" />
                </svg>
              </div>
            </div>
          </div>

          {/* Playhead spans every lane; positioned against the lane column. */}
          <div className={`tl-row pointer-events-none absolute inset-0`} aria-hidden>
            <span className="tl-track-label" />
            <div ref={laneRef} className="tl-lane">
              <div ref={headRef} className="tl-playhead" />
            </div>
          </div>
        </div>
      </div>

      <figcaption className="tl-readout">
        <span className={`tl-readout-label mono-label`}>
          {current.label} · <span dir="ltr">{current.range}</span>
        </span>
        <span className="tl-readout-body">{current.body}</span>
      </figcaption>
    </figure>
  );
}
