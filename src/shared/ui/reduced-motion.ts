import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Whether the user asked the OS/browser to minimize motion. For animations driven from
 * JavaScript; CSS animations use `@media (prefers-reduced-motion: reduce)` instead.
 * Client-only; `false` where `matchMedia` does not exist.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener?.("change", onChange);
  return () => query.removeEventListener?.("change", onChange);
}

/**
 * The reduced-motion preference as React state, updated live if the user changes it.
 * `false` on the server and while hydrating, then the real value: every effect that
 * reads it starts from its resting state, so nothing jumps when it switches.
 */
export function useReducedMotionPreference(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
