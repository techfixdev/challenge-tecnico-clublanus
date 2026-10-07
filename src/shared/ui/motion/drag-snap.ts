/*
 * Physics of a strip of cards the finger drags sideways (the transfer's recipient
 * carousel). Pure functions, so the feel is decided here and unit-tested, and the
 * component only feeds them the pointer's position and velocity:
 * - while dragging, the strip follows the finger 1:1 and resists past its ends
 *   (`withEdgeResistance`), the way an iOS list stretches instead of stopping dead;
 * - on release, the finger's velocity decides where the strip would coast to
 *   (`projectRelease`) and the strip snaps to the card nearest that point (`snapIndex`).
 *   The settle itself is the app's one critically damped spring, started at that same
 *   velocity, so the motion continues the throw instead of restarting.
 */

/**
 * Deceleration per millisecond of a coasting strip: UIScrollView's "fast" rate (0.99),
 * used by paging carousels. A flick at 1000px/s coasts ≈ 100px, about one card: a
 * flick moves to the next card, a hard one may skip one, never the whole list.
 */
const DECELERATION_RATE = 0.99;

/**
 * iOS's rubber-band constant: past an edge the strip first moves at 55% of the finger's
 * speed, and ever less the further it is pulled.
 */
const RUBBER_BAND = 0.55;

/**
 * Where a strip released at `offset` (px), moving at `velocity` (px/s), would come to
 * rest if it coasted freely: the geometric series of its per-millisecond deceleration.
 */
export function projectRelease(offset: number, velocity: number): number {
  return (
    offset + ((velocity / 1000) * DECELERATION_RATE) / (1 - DECELERATION_RATE)
  );
}

/**
 * The card a release settles on. `offset` is the strip's translation (0 centers the
 * first card, `-cardWidth` the second), `velocity` the finger's at release (px/s).
 */
export function snapIndex(
  offset: number,
  velocity: number,
  cardWidth: number,
  count: number,
): number {
  if (count <= 1) return 0;
  const nearest = Math.round(-projectRelease(offset, velocity) / cardWidth);
  return Math.min(Math.max(nearest, 0), count - 1);
}

/**
 * How far a strip pulled `overflow` px past its edge actually moves: close to the finger
 * at first, then ever slower, never more than `dimension` (the strip's visible width).
 */
export function rubberBand(overflow: number, dimension: number): number {
  if (overflow === 0) return 0;
  const distance = Math.abs(overflow);
  const travel =
    (1 - 1 / ((distance * RUBBER_BAND) / dimension + 1)) * dimension;
  return Math.sign(overflow) * travel;
}

/** The finger's position between `min` and `max`, rubber-banded beyond them. */
export function withEdgeResistance(
  value: number,
  min: number,
  max: number,
  dimension: number,
): number {
  if (value > max) return max + rubberBand(value - max, dimension);
  if (value < min) return min + rubberBand(value - min, dimension);
  return value;
}
