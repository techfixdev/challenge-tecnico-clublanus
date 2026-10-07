import { SPRING_PHYSICS } from "@/shared/ui/motion/springs";

import { nearestCard } from "./card-deck";

/*
 * Release physics of the card carousel, kept pure so it is unit-tested without a browser.
 * The deck's `offset` is how far it has travelled towards the later cards, in CSS px (the
 * opposite of its x translation); `snaps` are the offsets where each card rests (see
 * card-deck.ts); a `velocity` is in px/s along the same axis.
 */

/**
 * How far past either end the deck follows the finger (a fraction of the overshoot): a
 * faint resistance that says "no more cards", as on iOS.
 */
export const EDGE_RESISTANCE = 0.12;

/** How recent the finger's movement must be to count towards the release velocity. */
const VELOCITY_WINDOW_MS = 100;

/**
 * A release faster than this is a flick: it turns the card in its direction even after a
 * short drag. Slower, the card follows where the finger left the deck.
 */
export const FLICK_VELOCITY = 400;

/**
 * How far ahead a slow release is projected (seconds of its velocity): letting go while
 * still moving carries the deck a little further, as a physical object would.
 */
const MOMENTUM_PROJECTION_S = 0.2;

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

/** One position of the finger along the deck: `x` in CSS px at `time` in ms. */
export type FingerSample = { time: number; x: number };

/**
 * The finger's velocity at release (px/s), over its last moments only: what it did a
 * while ago is not how it let go. Measured up to the release itself, so a finger that
 * held still before lifting releases with no velocity at all.
 */
export function releaseVelocity(samples: FingerSample[], now: number): number {
  const recent = samples.filter(
    (sample) => now - sample.time <= VELOCITY_WINDOW_MS,
  );
  if (recent.length < 2) return 0;
  const first = recent[0]!;
  const last = recent.at(-1)!;
  const elapsed = now - first.time;
  return elapsed > 0 ? ((last.x - first.x) / elapsed) * 1000 : 0;
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
 * release goes to the card nearest to where its momentum carries the deck. Either way it
 * turns at most one card away from `from`, the card that was resting when the drag began.
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
  if (velocity >= FLICK_VELOCITY) target = Math.floor(progress) + 1;
  else if (velocity <= -FLICK_VELOCITY) target = Math.ceil(progress) - 1;
  else target = nearestCard(offset + velocity * MOMENTUM_PROJECTION_S, snaps);
  return clamp(
    target,
    Math.max(0, from - 1),
    Math.min(snaps.length - 1, from + 1),
  );
}

/**
 * The velocity the settling spring starts with: the finger's own, so the card keeps
 * moving as it was thrown. A critically damped spring launched towards its target faster
 * than its natural frequency × the distance would pass the target and come back (an
 * overshoot), so that one case is capped; a velocity away from the card is kept, the
 * spring turns it around without ever passing the card.
 */
export function settleVelocity(velocity: number, distance: number): number {
  if (distance === 0 || Math.sign(velocity) !== Math.sign(distance))
    return velocity;
  const omega = Math.sqrt(SPRING_PHYSICS.stiffness / SPRING_PHYSICS.mass);
  const limit = omega * Math.abs(distance);
  return Math.sign(velocity) * Math.min(Math.abs(velocity), limit);
}
