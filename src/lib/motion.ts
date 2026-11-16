/** Shared motion tokens so every screen moves the same way. */
export const ease = {
  outExpo: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOutQuart: [0.76, 0, 0.24, 1] as [number, number, number, number],
  outQuart: [0.25, 1, 0.5, 1] as [number, number, number, number],
};

export const duration = { fast: 0.18, base: 0.32, slow: 0.6, page: 0.7 };

/** Preloader length on a full page load, in ms. Content reveals once it lifts. */
export const PRELOADER_MS = 1750;

// Timestamp (performance.now) when page content becomes visible.
let revealAt = typeof performance !== "undefined" ? performance.now() + PRELOADER_MS : 0;

export function setRevealAt(msFromNow: number) {
  revealAt = performance.now() + msFromNow;
}

/** Seconds until content is uncovered by the preloader or page transition. */
export function entryDelay() {
  if (typeof performance === "undefined") return 0;
  return Math.max(0, revealAt - performance.now()) / 1000;
}
