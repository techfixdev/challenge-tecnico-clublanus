import type { Transition } from "motion/react";

import { FADE, INSTANT } from "@/shared/ui/motion/springs";
import { DURATION_S, EASE } from "@/shared/ui/motion/tokens";

/*
 * The send flow is one surface that rearranges itself between steps instead of sliding
 * in a new page. These are the pieces that travel (shared `layoutId`s: the same element,
 * seen by Motion in its old and new place) and the one timing they travel on.
 */

/** Elements that keep their identity from one step to the next. */
export const MORPH_ID = {
  /** The chosen recipient: the carousel's centered tile, then the header row's avatar. */
  avatar: "transfer-recipient-avatar",
  /** The big amount: the keypad's display, the review's total, the receipt's total. */
  amount: "transfer-amount",
} as const;

/**
 * A piece moving to its new place on the same surface: a container morph, so the base
 * duration on the one curve. Under reduced motion nothing travels: it is there at once.
 */
export function morphTransition(reduced: boolean): Transition {
  return reduced ? INSTANT : { duration: DURATION_S.base, ease: EASE };
}

/**
 * Content that arrives with a step (the keypad, the review's rows): its height opens on
 * the morph timing and it fades in on the short one, so it is readable early. Under
 * reduced motion the height jumps and only the fade stays.
 */
export function arrivalTransition(reduced: boolean): Transition {
  return {
    height: morphTransition(reduced),
    y: morphTransition(reduced),
    opacity: FADE,
  };
}
