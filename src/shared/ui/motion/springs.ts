import type { Transition } from "motion/react";

import { DURATION_S, EASE } from "./tokens";

/*
 * Springs, for motion a finger drives. A spring keeps the gesture's velocity and an
 * interrupted animation continues from where it is instead of restarting. There is one,
 * critically damped (damping ratio ≈ 1): it settles as fast as it can without ever
 * bouncing past its target. Overshoot reads as a toy, not as a bank card.
 */

/** Physics of the one spring, for `useSpring` (motion values). */
export const SPRING_PHYSICS = { stiffness: 300, damping: 35, mass: 1 } as const;

/** The one spring: card tilt and flip, the nav pill, the carousel dot, icon presses. */
export const SPRING: Transition = { type: "spring", ...SPRING_PHYSICS };

/**
 * Role names for the one spring, so call sites read as what they move. Not presets:
 * each is the same object (springs.test.ts checks it).
 */
export const INDICATOR_SPRING = SPRING;
export const PRESS_SPRING = SPRING;

/**
 * The only other spring, kept on purpose: the odometer digits roll on a softer spring
 * (damping ratio ≈ 0.97, it lands a few millionths past the digit, invisible) so a long
 * balance reads as one rolling number rather than a column of snaps.
 */
export const ROLL_SPRING: Transition = {
  type: "spring",
  stiffness: 170,
  damping: 24,
  mass: 0.9,
};

/** Opacity swaps (and the reduced-motion replacement for movement): a short fade. */
export const FADE: Transition = { duration: DURATION_S.fast, ease: EASE };

/** Under reduced motion, movement is applied at once. */
export const INSTANT: Transition = { duration: 0 };
