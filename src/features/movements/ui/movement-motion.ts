/**
 * Motion helpers for the movement list. The timing itself lives in CSS (`globals.css`,
 * `--motion-*` tokens); this only decides which row waits how many steps.
 */

/** At most 6 rows stagger (steps 0–5); the rest enter with the sixth. */
export const MAX_STAGGER_STEPS = 5;

/**
 * Stagger step of the row at `index`, counted from the top of the whole list. Only the
 * page's first paint animates (row-entrance.ts turns the entrance off afterwards), so a
 * page added by "Cargar más" never restarts the count from its own first row.
 */
export function rowEnterStep(index: number): number {
  return Math.min(Math.max(index, 0), MAX_STAGGER_STEPS);
}

/**
 * `view-transition-name` shared by a movement's type tile in the list and in its detail,
 * so the browser morphs one into the other. Unique per movement: two elements with the
 * same name on one page would cancel the transition.
 */
export function movementTileTransitionName(id: string): string {
  return `movement-tile-${id}`;
}
