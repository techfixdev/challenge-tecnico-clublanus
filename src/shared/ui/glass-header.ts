/*
 * Geometry of the collapsing header, shared by the header and anything that sticks
 * under it. The header keeps its height in the page flow (so nothing below it moves)
 * and sticks with a negative `top`: its top padding (and the eyebrow, if any) scrolls
 * off-screen, which is what makes it compact.
 */

/** Height of the header once stuck: 12px of padding + title + 12px of padding. */
export const COMPACT_HEADER_PX = 52;

/** How much of the header scrolls away before it sticks. */
export function headerCollapsePx(hasEyebrow: boolean): number {
  // 28px of the 40px top padding, plus the 16px eyebrow line ("Hola").
  return hasEyebrow ? 44 : 28;
}

/** Title scale once the header is compact. */
export const COMPACT_TITLE_SCALE = 0.85;
