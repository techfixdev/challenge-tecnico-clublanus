/*
 * Home builds itself once, when the app opens (styled in globals.css, `home-enter-*`):
 * the card deck rises from below and settles, the quick actions follow, and the latest
 * movements cascade in. It plays behind the brand intro's hand-off, not on top of it:
 * by CSS alone both start at the same first paint and the entrance waits the intro's
 * hold (`--brand-intro-dissolve-at`); once React runs, it follows the dissolve's real
 * timeline (BrandIntro moves that timeline forward as soon as the app has hydrated).
 */

/** Attribute on <html> once Home has built itself: it never plays again in the document. */
export const HOME_ENTERED = "data-home-entered";

/**
 * Attribute on <html> while the entrance plays behind the intro: it keeps the entrance's
 * hold after the intro unmounts, so the running animations do not jump.
 */
export const HOME_ENTERING = "data-home-entering";

/** CSS animations of the entrance (see globals.css). */
export const HOME_ENTRANCE_ANIMATIONS = new Set([
  "home-enter-card",
  "home-enter-rise",
]);

/** The intro's dissolve, as Home's entrance needs it. */
export type IntroDissolve = {
  /** Where the dissolve's timeline stands, in ms (its hold included). */
  currentTime: number;
  /** Its hold before dissolving, in ms: where Home's entrance starts. */
  delay: number;
  finished: boolean;
};

/**
 * Where one entrance animation's timeline should stand (ms). Both timelines share the
 * same hold, so following the dissolve means taking its time; when the intro is already
 * gone (Home streamed in after it), the entrance skips its hold and starts now.
 */
export function entranceTime(
  current: number,
  intro: IntroDissolve | null,
): number {
  if (!intro) return current;
  if (intro.finished) return Math.max(current, intro.delay);
  return intro.currentTime;
}
