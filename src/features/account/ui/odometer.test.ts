import { describe, expect, it } from "vitest";

import {
  ODOMETER_STAGGER_S,
  digitOffset,
  odometerCells,
  odometerText,
} from "./odometer";

function shape(balance: string) {
  return odometerCells(balance).map((cell) =>
    cell.kind === "digit" ? cell.digit : cell.char,
  );
}

describe("odometer cells", () => {
  it("maps a balance to one column per digit and fixed separators", () => {
    expect(shape("978.85")).toEqual([9, 7, 8, ",", 8, 5]);
    expect(odometerText(odometerCells("978.85"))).toBe("978,85");
  });

  it("uses the app's (Argentine) money format: dot thousands, comma decimals, whole amounts", () => {
    expect(odometerText(odometerCells("1234.56"))).toBe("1.234,56");
    expect(shape("312400.50")).toEqual([3, 1, 2, ".", 4, 0, 0, ",", 5, 0]);
    expect(odometerText(odometerCells("12.5"))).toBe("12,50");
    expect(odometerText(odometerCells("0"))).toBe("0");
    expect(odometerText(odometerCells("0.00"))).toBe("0");
  });

  it("keeps one cell per character, so the width is fixed by the final text", () => {
    expect(odometerCells("1234.56")).toHaveLength("1.234,56".length);
  });

  it("staggers the roll from right to left", () => {
    const delays = odometerCells("1234.56").flatMap((cell) =>
      cell.kind === "digit" ? [cell.delay] : [],
    );
    expect(delays).toEqual(
      [5, 4, 3, 2, 1, 0].map((step) => step * ODOMETER_STAGGER_S),
    );
  });

  it("keys columns from the right, so they survive a new leading digit", () => {
    const small = odometerCells("978.85").map((cell) => cell.key);
    const large = odometerCells("1978.85").map((cell) => cell.key);
    expect(large.slice(-small.length)).toEqual(small);
  });

  it("offsets each strip by a tenth per digit", () => {
    expect(digitOffset(0)).toBe("0%");
    expect(digitOffset(7)).toBe("-70%");
  });
});
