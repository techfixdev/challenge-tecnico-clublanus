import { formatAmount } from "@/shared/lib/format";

/** Long enough to read as "counting", short enough not to delay reading the balance. */
export const COUNT_UP_MS = 600;

/** Decelerates: the number runs up quickly and settles on the balance. */
function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

/**
 * Text of the balance `elapsedMs` into its count-up from 0.
 * - Every frame uses the final value's decimals, so the number keeps its width.
 * - The last frame is the regular formatter applied to the original decimal string, so
 *   the value that stays on screen is exact (the float math only drives the animation).
 */
export function countUpFrame(
  balance: string,
  elapsedMs: number,
  durationMs = COUNT_UP_MS,
): string {
  const final = formatAmount(balance);
  if (elapsedMs >= durationMs) return final;
  const progress = Math.max(elapsedMs, 0) / durationMs;
  return formatAmount(Number(balance) * easeOutCubic(progress), {
    fractionDigits: final.includes(".") ? 2 : 0,
  });
}
