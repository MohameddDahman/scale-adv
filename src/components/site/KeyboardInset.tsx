"use client";

import { useEffect } from "react";

/**
 * Phones: keeps the bottom sheets above the on-screen keyboard. Mounted inside
 * an open sheet; while it's there, <html> carries the keyboard's height (--kb),
 * the height left above it (--vvh), and data-keyboard while the keyboard is up.
 * Without the visual viewport API nothing changes.
 */
export function KeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let wasUp = false;
    const update = () => {
      // Pinch-zoom also shrinks the visual viewport; only a keyboard counts.
      const zoomed = vv.scale > 1.01;
      const kb = zoomed ? 0 : Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      const up = kb > 80;
      root.style.setProperty("--kb", `${up ? kb : 0}px`);
      root.style.setProperty("--vvh", `${Math.round(zoomed ? window.innerHeight : vv.height)}px`);
      root.toggleAttribute("data-keyboard", up);
      // The keyboard just opened: bring the field being typed in back into view inside the sheet.
      if (up && !wasUp) {
        requestAnimationFrame(() => (document.activeElement as HTMLElement | null)?.scrollIntoView?.({ block: "nearest" }));
      }
      wasUp = up;
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--kb");
      root.style.removeProperty("--vvh");
      root.removeAttribute("data-keyboard");
    };
  }, []);
  return null;
}
