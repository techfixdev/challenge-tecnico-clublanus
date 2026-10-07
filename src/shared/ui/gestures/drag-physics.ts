/*
 * The math behind the app's drag gestures (the edge swipe back, a sheet dragged down),
 * kept free of the DOM so every decision a release makes can be tested on its own.
 * Offsets are in pixels along the gesture's axis, velocities in pixels per second.
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

/** Share of the sheet's height past which releasing the drag dismisses it. */
export const SHEET_DISMISS_FRACTION = 0.3;

/**
 * A release this fast decides on its own, whatever the distance: a flick toward the
 * goal completes, a flick away from it cancels (the finger changed its mind).
 */
export const FLICK_VELOCITY = 500;

/** iOS's scroll-view resistance: how strongly a drag past its limit is held back. */
const RUBBER_BAND_COEFFICIENT = 0.55;

/** The release velocity is measured over the gesture's last stretch... */
const VELOCITY_WINDOW_MS = 100;
/** ...and is zero if the finger rested longer than this before lifting. */
const VELOCITY_STALE_MS = 50;

export type Axis = "x" | "y";

/**
 * The axis a press is moving along, once it has moved past `slop`; `null` before.
 * A tie goes to the vertical axis, so a diagonal start never steals a page scroll.
 */
export function lockAxis(dx: number, dy: number, slop: number): Axis | null {
  if (Math.hypot(dx, dy) < slop) return null;
  return Math.abs(dx) > Math.abs(dy) ? "x" : "y";
}

export type DragSample = { time: number; position: number };

/**
 * The finger's velocity when it lifts (`now`): the distance covered over the last
 * `VELOCITY_WINDOW_MS`, so the speed of the release counts, not the gesture's average.
 * A finger that stopped before lifting has no velocity, even if it was fast earlier.
 */
export function estimateVelocity(samples: DragSample[], now: number): number {
  const last = samples.at(-1);
  if (!last || now - last.time > VELOCITY_STALE_MS) return 0;
  const recent = samples.filter(({ time }) => time >= now - VELOCITY_WINDOW_MS);
  const first = recent[0];
  const elapsedMs = last.time - first.time;
  if (recent.length < 2 || elapsedMs <= 0) return 0;
  return ((last.position - first.position) / elapsedMs) * 1000;
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

/** Whether releasing a sheet dragged down by `offset` (moving at `velocity`) closes it. */
export function shouldDismissSheet(
  offset: number,
  velocity: number,
  height: number,
): boolean {
  return releaseCompletes(offset, velocity, height * SHEET_DISMISS_FRACTION);
}

/**
 * How far something follows a finger that pulls it `distance` past its limit: almost 1:1
 * at first, then less and less, never reaching `dimension` (iOS's rubber band).
 */
export function rubberBand(distance: number, dimension: number): number {
  return (
    (1 - 1 / ((distance * RUBBER_BAND_COEFFICIENT) / dimension + 1)) * dimension
  );
}

/** The share of `extent` an `offset` has covered, from 0 (at rest) to 1. */
export function dragProgress(offset: number, extent: number): number {
  if (extent <= 0) return 0;
  return Math.min(1, Math.max(0, offset / extent));
}
