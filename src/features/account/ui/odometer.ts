import { formatAmount, type MoneyInput } from "@/shared/lib/format";

/** Delay between neighboring digits: the roll travels from the cents to the left. */
export const ODOMETER_STAGGER_S = 0.04;

export type OdometerCell =
  | { kind: "digit"; key: string; digit: number; delay: number }
  | { kind: "symbol"; key: string; char: string };

/**
 * Splits a balance into odometer cells: one rolling column per digit and a fixed cell
 * per separator, from the same formatter as the rest of the app ("1,234.56", "12.50",
 * "0"). Keys and delays count from the right, so a column keeps its identity (and its
 * spring) when the number gains a digit on the left, and the cents roll first.
 */
export function odometerCells(balance: MoneyInput): OdometerCell[] {
  const text = formatAmount(balance);
  const cells: OdometerCell[] = [];
  let digitsFromRight = 0;
  for (let index = text.length - 1; index >= 0; index -= 1) {
    const char = text[index]!;
    const position = text.length - 1 - index;
    if (/\d/.test(char)) {
      cells.unshift({
        kind: "digit",
        key: `digit-${position}`,
        digit: Number(char),
        delay: digitsFromRight * ODOMETER_STAGGER_S,
      });
      digitsFromRight += 1;
    } else {
      cells.unshift({ kind: "symbol", key: `symbol-${position}`, char });
    }
  }
  return cells;
}

/** The text the cells spell once every column has settled. */
export function odometerText(cells: OdometerCell[]): string {
  return cells
    .map((cell) => (cell.kind === "digit" ? String(cell.digit) : cell.char))
    .join("");
}

/**
 * Vertical offset of a column's 0–9 strip that shows `digit`, as a percentage of the
 * strip (each digit is a tenth of it).
 */
export function digitOffset(digit: number): string {
  return `${-digit * 10}%`;
}

/**
 * Optical spacing for a column. Poppins' 1 is set with wider sidebearings than the other
 * digits (about 0.12em around it against 0.08em between the rest), so "31 2" reads as a
 * gap even at natural widths. Pulling its neighbors in evens the ink gaps; the right side
 * gets more because that is where the 1's flagless stem leaves the space.
 */
export function digitSidebearing(
  digit: number,
): { marginLeft: string; marginRight: string } | undefined {
  return digit === 1
    ? { marginLeft: "-0.02em", marginRight: "-0.035em" }
    : undefined;
}
