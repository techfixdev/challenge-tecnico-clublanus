/*
 * The app's motion language, for animations driven from JavaScript. CSS reads the same
 * values from globals.css (`--motion-duration-*`, `--motion-ease`); tokens.test.ts keeps
 * both in step.
 *
 * Three durations and one curve, nothing else:
 * - fast (160ms): feedback and small swaps (press, fades, the balance mask);
 * - base (280ms): content arriving in place (rows, a reveal, a container morph);
 * - nav (400ms): a whole screen travelling (push, pop).
 * The curve is the iOS sheet curve: a quick start that glides into place, never past it.
 * Motion a finger drives (tilt, flip, indicators) uses the one spring in springs.ts.
 */

/** Durations in milliseconds. */
export const DURATION = { fast: 160, base: 280, nav: 400 } as const;

/** The same durations in seconds, as Motion expects them. */
export const DURATION_S = {
  fast: DURATION.fast / 1000,
  base: DURATION.base / 1000,
  nav: DURATION.nav / 1000,
} as const;

/** The one easing curve, as Motion's cubic-bezier control points. */
export const EASE = [0.32, 0.72, 0, 1] as [number, number, number, number];

/** The same curve as CSS (`--motion-ease` in globals.css). */
export const EASE_CSS = `cubic-bezier(${EASE.join(", ")})`;
