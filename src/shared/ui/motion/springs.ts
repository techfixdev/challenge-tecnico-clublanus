import type { Transition } from "motion/react";

/*
 * Spring presets. Springs (not fixed durations) are what makes motion feel physical:
 * they keep the finger's velocity and settle naturally, and an interrupted animation
 * continues from where it is instead of restarting.
 */

/** The card follows the finger closely and wobbles once when released. */
export const TILT_SPRING = { stiffness: 300, damping: 20 } as const;

/** Odometer digits: a quick roll that settles without bouncing past the digit. */
export const ROLL_SPRING: Transition = {
  type: "spring",
  stiffness: 170,
  damping: 24,
  mass: 0.9,
};

/** Indicators (nav pill, carousel dot): snappy, with a hint of overshoot. */
export const INDICATOR_SPRING: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 34,
};

/** Tap feedback on icons. */
export const PRESS_SPRING: Transition = {
  type: "spring",
  stiffness: 600,
  damping: 28,
};

/** Under reduced motion every change is applied at once. */
export const INSTANT: Transition = { duration: 0 };

/** Card flip: a physical turn that settles with a slight overshoot. */
export const FLIP_SPRING = { stiffness: 220, damping: 24 } as const;

/** Reduced-motion replacement for movements: a short crossfade. */
export const CROSSFADE: Transition = { duration: 0.2, ease: "easeOut" };
