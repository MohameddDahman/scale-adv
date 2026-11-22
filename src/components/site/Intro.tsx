"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The opening: a black camera frame starts rolling (REC, running timecode),
 * SCALE lands letter by letter, the orange ADV tab wipes in, then the whole
 * mark flies into its place in the nav while the black lifts like a curtain.
 *
 * Plays once per visit (sessionStorage), never under reduced motion, and any
 * scroll, tap or key skips straight to the landing. The script in the page
 * <head> decides before the first paint whether it plays (html[data-intro]),
 * and the CSS fades it out on its own if this component never runs.
 */
export function Intro({ tagline }: { tagline: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const timecodeRef = useRef<HTMLSpanElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const root = rootRef.current;
    const mark = markRef.current;
    if (html.dataset.intro !== "play" || !root || !mark) {
      setGone(true);
      return;
    }
    root.dataset.js = "";
    try {
      sessionStorage.setItem("scale.intro", "1");
    } catch {
      // Storage blocked: it may play again on the next page, which is harmless.
    }

    // The camera's timecode, running at 25 frames a second.
    const started = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = (now - started) / 1000;
      const pad = (n: number) => String(n).padStart(2, "0");
      if (timecodeRef.current) timecodeRef.current.textContent = `00:00:${pad(Math.floor(t) % 60)}:${pad(Math.floor((t % 1) * 25))}`;
      frame = requestAnimationFrame(tick);
    });

    const timers: number[] = [];
    let flying = false;
    const finish = () => {
      html.dataset.intro = "done";
      window.dispatchEvent(new Event("scale:intro-done"));
      setGone(true);
    };
    const fly = () => {
      if (flying) return;
      flying = true;
      const target = document.querySelector<HTMLElement>("[data-site-logo] [data-wordmark-row]");
      const from = mark.getBoundingClientRect();
      if (target && from.width) {
        const to = target.getBoundingClientRect();
        const scale = to.width / from.width;
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        mark.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      }
      root.dataset.phase = "fly";
      timers.push(
        window.setTimeout(() => {
          html.dataset.intro = "landed"; // the nav logo takes over (see [data-site-logo] in globals.css)
          root.dataset.phase = "landed";
        }, 720),
        window.setTimeout(finish, 980),
      );
    };

    // Fly about 1.4s after the page first painted, however long the script took to start.
    timers.push(window.setTimeout(fly, Math.max(180, 1400 - performance.now())));
    const skip = () => fly();
    const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    events.forEach((e) => window.addEventListener(e, skip, { once: true, passive: true }));

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach((t) => clearTimeout(t));
      events.forEach((e) => window.removeEventListener(e, skip));
    };
  }, []);

  if (gone) return null;
  return (
    <div ref={rootRef} className="intro" aria-hidden="true">
      <span className="intro-bg" />
      <span className="intro-frame" />
      <span className="intro-hud" dir="ltr">
        <span className="intro-rec">
          <span className="rec-dot" /> REC
        </span>
        <span ref={timecodeRef} className="intro-tc">
          00:00:00:00
        </span>
      </span>
      <span className="intro-center">
        <span ref={markRef} className="intro-mark" dir="ltr">
          <span className="intro-scale">
            {"SCALE".split("").map((ch, i) => (
              <span key={i} style={{ "--i": i } as React.CSSProperties}>
                {ch}
              </span>
            ))}
          </span>
          <span className="intro-adv">ADV</span>
        </span>
        <span className="intro-tag">{tagline}</span>
      </span>
      <span className="intro-bar" />
    </div>
  );
}

/** Runs in <head> before the first paint: decides whether the intro plays. */
export const INTRO_HEAD_SCRIPT = `(function(){var d=document.documentElement;d.setAttribute("data-js","");try{var seen=sessionStorage.getItem("scale.intro");var calm=window.matchMedia("(prefers-reduced-motion: reduce)").matches;d.setAttribute("data-intro",seen||calm?"skip":"play")}catch(e){d.setAttribute("data-intro","skip")}})();`;
