import { projectRelease } from "@/shared/ui/gestures/drag-physics";

import { nearestCard } from "./card-deck";

/*
 * Release physics specific to the card carousel, kept pure so it is unit-tested without a
 * browser; the model every drag shares (release velocity, coasting, the settle) is in
 * shared/ui/gestures/drag-physics.ts. The deck's `offset` is how far it has travelled towards the later cards, in CSS px (the
 * opposite of its x translation); `snaps` are the offsets where each card rests (see
 * card-deck.ts); a `velocity` is in px/s along the same axis.
 */

/**
 * How far past either end the deck follows the finger (a fraction of the overshoot): a
 * faint resistance that says "no more cards". Fainter than the shared rubber band on
 * purpose: the deck holds two or three cards, and a long stretch would read as more.
 */
export const EDGE_RESISTANCE = 0.12;

/**
 * A release faster than this is a flick: it turns the card in its direction even after a
 * short drag. Slower, the card follows where the finger left the deck. Lighter than the
 * shared `FLICK_VELOCITY` (500) of the edge swipe and the sheet: a deck flick only ever
 * turns one card, which is easy to undo, whereas those leave the screen or close it.
 */
export const DECK_FLICK_VELOCITY = 400;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** The deck's offset for a finger that would take it to `offset`, resisting past the ends. */
export function resistEdges(offset: number, maxOffset: number): number {
  if (offset < 0) return offset * EDGE_RESISTANCE;
  if (offset > maxOffset)
    return maxOffset + (offset - maxOffset) * EDGE_RESISTANCE;
  return offset;
}

/** The deck's position counted in cards: 0 on the first, 1.5 halfway to the third. */
export function snapProgress(offset: number, snaps: number[]): number {
  if (snaps.length < 2) return 0;
  const last = snaps.length - 1;
  if (offset <= snaps[0]!) return 0;
  if (offset >= snaps[last]!) return last;
  const index = snaps.findIndex((snap) => snap > offset) - 1;
  const from = snaps[index]!;
  const to = snaps[index + 1]!;
  return index + (offset - from) / Math.max(1, to - from);
}

/**
 * The card a release settles on. A flick goes to the next card in its direction from
 * where the deck is now (so flicking back after a long drag returns to the start); a slow
 * release goes to the card nearest to where it would coast to (`projectRelease`, the
 * deceleration every drag in the app shares). Either way it turns at most one card away
 * from `from`, the card that was resting when the drag began.
 */
export function snapIndex({
  offset,
  velocity,
  snaps,
  from,
}: {
  offset: number;
  velocity: number;
  snaps: number[];
  from: number;
}): number {
  if (snaps.length === 0) return 0;
  const progress = snapProgress(offset, snaps);
  let target: number;
  if (velocity >= DECK_FLICK_VELOCITY) target = Math.floor(progress) + 1;
  else if (velocity <= -DECK_FLICK_VELOCITY) target = Math.ceil(progress) - 1;
  else target = nearestCard(projectRelease(offset, velocity), snaps);
  return clamp(
    target,
    Math.max(0, from - 1),
    Math.min(snaps.length - 1, from + 1),
  );
}
