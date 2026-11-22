"use client";

import { useEffect, useRef, useState } from "react";

/** How long the full mark holds before it flies into the nav, counted from when the intro first shows. */
const HOLD = 1900;
/** With "reduce motion" on: how long the still frame stays before it dissolves. */
const CALM_HOLD = 1300;

/**
 * The opening: a black camera frame starts rolling (REC, running timecode),
 * SCALE lands letter by letter, the orange ADV tab wipes in, then the whole
 * mark flies into its place in the nav while the black lifts like a curtain.
 *
 * Plays every time the site is opened or refreshed, but not on Back/Forward.
 * With "reduce motion" on, nothing moves: the frame and the mark simply show,
 * then dissolve. Any scroll, tap or key skips to the end. The script in the
 * page <head> decides before the first paint (html[data-intro]), and the CSS
 * fades the intro out on its own if this component never runs.
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
    const mode = html.dataset.intro;
    if ((mode !== "play" && mode !== "calm") || !root || !mark) {
      setGone(true);
      return;
    }
    const calm = mode === "calm";

    const finish = () => {
      html.dataset.intro = "done";
      window.dispatchEvent(new Event("scale:intro-done"));
      setGone(true);
    };

    // When the intro first showed: its CSS animations started then. Timing from
    // there (not from page load) means a slow phone still sees the whole thing.
    const startTimes = (root.getAnimations?.({ subtree: true }) ?? [])
      .map((a) => a.startTime)
      .filter((t): t is number => typeof t === "number");
    const shownAt = startTimes.length ? Math.min(...startTimes) : null;

    // JavaScript arrived so late that the CSS has already faded the intro out by itself.
    if (shownAt !== null && performance.now() - shownAt > HOLD + 1000) {
      finish();
      return;
    }
    root.dataset.js = ""; // from here on this component runs it (the CSS fallback stands down)

    const timers: number[] = [];
    let zero = 0;
    let frame = 0;
    let leaving = false;

    // The camera's timecode, running at 25 frames a second.
    const tick = (now: number) => {
      const t = Math.max(0, now - zero) / 1000;
      const pad = (n: number) => String(n).padStart(2, "0");
      if (timecodeRef.current) timecodeRef.current.textContent = `00:00:${pad(Math.floor(t) % 60)}:${pad(Math.floor((t % 1) * 25))}`;
      frame = requestAnimationFrame(tick);
    };

    const fly = () => {
      if (leaving) return;
      leaving = true;
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
    const dissolve = () => {
      if (leaving) return;
      leaving = true;
      root.dataset.phase = "fade";
      timers.push(window.setTimeout(finish, 520));
    };
    const leave = calm ? dissolve : fly;
    const begin = (from: number) => {
      zero = from;
      if (!calm) frame = requestAnimationFrame(tick);
      timers.push(window.setTimeout(leave, Math.max(180, zero + (calm ? CALM_HOLD : HOLD) - performance.now())));
    };
    // Nothing drawn yet (this ran before the first paint, or the page opened in a
    // background tab): the intro starts on the next frame, so count from that one.
    if (shownAt !== null) begin(shownAt);
    else frame = requestAnimationFrame(begin);

    const skip = () => leave();
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

/**
 * Runs in <head> before the first paint and sets html[data-intro]:
 * "play" on every open or refresh, "calm" when the device asks for reduced
 * motion, "skip" when coming back with Back/Forward.
 */
export const INTRO_HEAD_SCRIPT = `(function(){var d=document.documentElement,m="play";d.setAttribute("data-js","");try{var n=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];if(n?n.type==="back_forward":performance.navigation&&performance.navigation.type===2)m="skip";else if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)m="calm"}catch(e){}d.setAttribute("data-intro",m)})();`;
