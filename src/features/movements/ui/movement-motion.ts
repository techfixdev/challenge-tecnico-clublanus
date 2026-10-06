/**
 * Motion helpers for the movement list. The timing itself lives in CSS (`globals.css`,
 * `--motion-*` tokens); this only decides which row waits how many steps.
 */

/** 7 steps × 40ms = the last row starts at most 280ms after the first one. */
export const MAX_STAGGER_STEPS = 7;

/**
 * Stagger step of the row at `index` in a list whose newest batch starts at `batchStart`
 * ("Cargar más" appends batches). Rows above the batch are already on screen and are
 * never re-inserted, so their value does not matter; the batch's first row starts at 0.
 */
export function rowEnterStep(index: number, batchStart = 0): number {
  return Math.min(Math.max(index - batchStart, 0), MAX_STAGGER_STEPS);
}

/**
 * `view-transition-name` shared by a movement's type tile in the list and in its detail,
 * so the browser morphs one into the other. Unique per movement: two elements with the
 * same name on one page would cancel the transition.
 */
export function movementTileTransitionName(id: string): string {
  return `movement-tile-${id}`;
}
