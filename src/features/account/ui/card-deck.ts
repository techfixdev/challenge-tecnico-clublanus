/**
 * Scroll math for the card carousel, kept pure so it is unit-tested without a browser.
 * A "snap" is the scroll offset where a card rests (its left edge on the padding line);
 * the last ones are clamped to the maximum scroll, which is where they really rest.
 */

/** Non-active cards shrink to this scale and fade to this opacity. */
export const INACTIVE_SCALE = 0.92;
export const INACTIVE_OPACITY = 0.7;

export function measureSnaps(offsets: number[], maxScroll: number): number[] {
  const first = offsets[0] ?? 0;
  return offsets.map((offset) =>
    Math.max(0, Math.min(offset - first, maxScroll)),
  );
}

/**
 * How far card `index` is from resting in place, from 0 (active) to 1 (a full card
 * away). Before the carousel is measured, the first card is active and the rest are
 * one card away, which is also how the server renders them.
 */
export function cardDistance(
  scroll: number,
  snaps: number[],
  index: number,
): number {
  const snap = snaps[index];
  if (snaps.length < 2 || snap === undefined) return index === 0 ? 0 : 1;
  const step = Math.max(1, snaps[1]! - snaps[0]!);
  return Math.min(1, Math.abs(scroll - snap) / step);
}

/** The card closest to the current scroll position. */
export function nearestCard(scroll: number, snaps: number[]): number {
  let nearest = 0;
  snaps.forEach((snap, index) => {
    if (Math.abs(scroll - snap) < Math.abs(scroll - snaps[nearest]!))
      nearest = index;
  });
  return nearest;
}

export function scaleAt(distance: number): number {
  return 1 - (1 - INACTIVE_SCALE) * distance;
}

export function opacityAt(distance: number): number {
  return 1 - (1 - INACTIVE_OPACITY) * distance;
}
