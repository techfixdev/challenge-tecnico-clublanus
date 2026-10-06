/**
 * Tap vs swipe for the flip. The card sits inside a horizontal carousel and tilts under a
 * dragged finger, so only a real tap flips it: a short press that stays in place while
 * the carousel stays put. Keyboard activation (Enter / Space) always flips.
 */

/** Max finger travel (CSS px) for a press to still count as a tap. */
export const TAP_SLOP_PX = 10;
/** A press held longer than this is looking at the tilt, not a tap. */
export const TAP_MAX_MS = 500;

export type PointerGesture = {
  /** Travel from pointerdown to the click, in CSS px. */
  dx: number;
  dy: number;
  /** How far the card itself moved (carousel scroll) during the press. */
  cardShift: number;
  elapsedMs: number;
  /** The browser cancelled the pointer (it took the gesture over, e.g. to scroll). */
  cancelled?: boolean;
};

export function isFlipTap({
  keyboard = false,
  pointer,
}: {
  keyboard?: boolean;
  /** The press that produced this click; absent for a click no pointer started. */
  pointer?: PointerGesture;
}): boolean {
  if (keyboard || !pointer) return true;
  if (pointer.cancelled) return false;
  return (
    Math.hypot(pointer.dx, pointer.dy) < TAP_SLOP_PX &&
    Math.abs(pointer.cardShift) < TAP_SLOP_PX &&
    pointer.elapsedMs <= TAP_MAX_MS
  );
}
