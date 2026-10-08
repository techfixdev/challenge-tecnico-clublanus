import { SPRING_PHYSICS } from "../motion/springs";

/*
 * The physics every drag in the app shares (the transfer's recipient carousel, the card
 * deck, the edge swipe back), kept free of the DOM so each decision
 * a release makes is unit-tested on its own. Offsets are in pixels along the gesture's
 * axis, velocities in pixels per second. The feel is one model throughout:
 * - while dragging, the surface follows the finger 1:1 and, past its limit, stretches
 *   with iOS's rubber band instead of stopping dead (`rubberBand`, `withEdgeResistance`);
 * - the release velocity is the finger's over its last moments (`releaseVelocity`);
 * - a released surface coasts as a scroll view decelerates (`projectRelease`) and lands
 *   on the one critically damped spring, started at the finger's velocity, capped only so
 *   it never passes where it rests (`settleVelocity`).
 * The card deck shares the velocity, the coast and the settle, but keeps two rules of its
 * own (features/account/ui/card-snap.ts): a fainter, linear pull past its ends
 * (`resistEdges`), since a long stretch would read as more cards, and a lighter flick
 * (`DECK_FLICK_VELOCITY`, 400), since a flick there turns one card and is easy to undo.
 */

/** How far from the screen's left edge a press can start the swipe back. */
export const EDGE_ZONE_PX = 20;

/**
 * How far the finger travels before the gesture decides it is a drag on its axis or
 * something else (a page scroll). Below it a press is still a tap.
 */
export const AXIS_LOCK_SLOP_PX = 8;

/** Share of the screen's width past which releasing the swipe back completes it. */
export const BACK_COMPLETE_FRACTION = 0.35;

/**
 * A release this fast decides on its own, whatever the distance: a flick toward the
 * goal completes, a flick away from it cancels (the finger changed its mind).
 */
export const FLICK_VELOCITY = 500;

/**
 * iOS's rubber-band constant: past its limit a surface first moves at 55% of the
 * finger's speed, and ever less the further it is pulled.
 */
const RUBBER_BAND_COEFFICIENT = 0.55;

/**
 * Deceleration per millisecond of a coasting surface: UIScrollView's "fast" rate (0.99),
 * used by paging carousels. A flick at 1000px/s coasts ≈ 100px, about one card: a flick
 * moves to the next card, a hard one may skip one, never the whole list.
 */
const DECELERATION_RATE = 0.99;

/** The release velocity is measured over the gesture's last stretch only. */
const VELOCITY_WINDOW_MS = 100;

export type Axis = "x" | "y";

/**
 * The axis a press is moving along, once it has moved past `slop`; `null` before.
 * A tie goes to the vertical axis, so a diagonal start never steals a page scroll.
 */
export function lockAxis(dx: number, dy: number, slop: number): Axis | null {
  if (Math.hypot(dx, dy) < slop) return null;
  return Math.abs(dx) > Math.abs(dy) ? "x" : "y";
}

/** One position of the finger along the gesture's axis, at `time` in ms. */
export type DragSample = { time: number; position: number };

/**
 * The finger's velocity when it lifts (`now`): the distance covered over the last
 * `VELOCITY_WINDOW_MS`, so the speed of the release counts, not the gesture's average.
 * Measured up to the release itself, so a pause before lifting slows the throw down, and
 * a finger that rested for the whole window throws nothing, however fast it was earlier.
 */
export function releaseVelocity(samples: DragSample[], now: number): number {
  const recent = samples.filter(({ time }) => now - time <= VELOCITY_WINDOW_MS);
  if (recent.length < 2) return 0;
  const first = recent[0]!;
  const last = recent.at(-1)!;
  const elapsedMs = now - first.time;
  return elapsedMs > 0
    ? ((last.position - first.position) / elapsedMs) * 1000
    : 0;
}

/**
 * Where a surface released at `offset`, moving at `velocity`, would come to rest if it
 * coasted freely: the geometric series of its per-millisecond deceleration.
 */
export function projectRelease(offset: number, velocity: number): number {
  return (
    offset + ((velocity / 1000) * DECELERATION_RATE) / (1 - DECELERATION_RATE)
  );
}

/**
 * The step a strip of equal steps settles on. `offset` is the strip's translation (0
 * centers the first step, `-step` the second), `velocity` the finger's at release.
 */
export function snapToStep(
  offset: number,
  velocity: number,
  step: number,
  count: number,
): number {
  if (count <= 1) return 0;
  const nearest = Math.round(-projectRelease(offset, velocity) / step);
  return Math.min(Math.max(nearest, 0), count - 1);
}

/**
 * How far something pulled `overflow` px past its limit actually moves: almost 1:1 at
 * first, then less and less, never reaching `dimension` (iOS's rubber band). The sign
 * says which way it was pulled.
 */
export function rubberBand(overflow: number, dimension: number): number {
  if (overflow === 0) return 0;
  const distance = Math.abs(overflow);
  const travel =
    (1 - 1 / ((distance * RUBBER_BAND_COEFFICIENT) / dimension + 1)) *
    dimension;
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

/**
 * The velocity the settling spring starts with: the finger's own, so the surface keeps
 * moving as it was thrown. A critically damped spring launched towards its target faster
 * than its natural frequency × the distance would pass the target and come back (an
 * overshoot), so that one case is capped; a velocity away from the target is kept, the
 * spring turns it around without ever passing it.
 */
export function settleVelocity(velocity: number, distance: number): number {
  if (distance === 0 || Math.sign(velocity) !== Math.sign(distance))
    return velocity;
  const omega = Math.sqrt(SPRING_PHYSICS.stiffness / SPRING_PHYSICS.mass);
  const limit = omega * Math.abs(distance);
  return Math.sign(velocity) * Math.min(Math.abs(velocity), limit);
}

/**
 * Whether a release `offset` along the gesture's goal, moving at `velocity`, completes
 * it: a flick decides by its direction; otherwise the distance does.
 */
function releaseCompletes(
  offset: number,
  velocity: number,
  threshold: number,
): boolean {
  if (offset <= 0 || velocity < -FLICK_VELOCITY) return false;
  return velocity > FLICK_VELOCITY || offset > threshold;
}

/** Whether releasing the swipe back at `offset` (moving at `velocity`) goes back. */
export function shouldCompleteBack(
  offset: number,
  velocity: number,
  width: number,
): boolean {
  return releaseCompletes(offset, velocity, width * BACK_COMPLETE_FRACTION);
}

/** The share of `extent` an `offset` has covered, from 0 (at rest) to 1. */
export function dragProgress(offset: number, extent: number): number {
  if (extent <= 0) return 0;
  return Math.min(1, Math.max(0, offset / extent));
}
