/**
 * Whether the user asked the OS/browser to minimize motion. For animations driven from
 * JavaScript; CSS animations use `@media (prefers-reduced-motion: reduce)` instead.
 * Client-only; `false` where `matchMedia` does not exist.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
