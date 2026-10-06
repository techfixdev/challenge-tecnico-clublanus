import { describe, expect, it } from "vitest";

import { formatAmount } from "@/shared/lib/format";

import { COUNT_UP_MS, countUpFrame } from "./count-up";

describe("countUpFrame", () => {
  it("starts at zero with the final value's decimals", () => {
    expect(countUpFrame("978.85", 0)).toBe("0.00");
    expect(countUpFrame("1000.00", 0)).toBe("0");
  });

  it("ends exactly on the formatted balance, never a float approximation", () => {
    expect(countUpFrame("978.85", COUNT_UP_MS)).toBe("978.85");
    expect(countUpFrame("978.85", COUNT_UP_MS * 5)).toBe(
      formatAmount("978.85"),
    );
    expect(countUpFrame("1234567.89", COUNT_UP_MS)).toBe("1,234,567.89");
    expect(countUpFrame("1000.00", COUNT_UP_MS)).toBe("1,000");
  });

  it("eases out: fast at first, settling at the end, never going back", () => {
    const values = Array.from({ length: 13 }, (_, step) =>
      Number(
        countUpFrame("1000.00", (COUNT_UP_MS / 12) * step).replace(/,/g, ""),
      ),
    );

    expect(values[6]).toBeGreaterThan(500); // more than half the value at half the time
    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]).toBeGreaterThanOrEqual(values[index - 1]);
    }
  });

  it("keeps the width stable while counting (always the final decimals)", () => {
    expect(countUpFrame("978.85", COUNT_UP_MS / 2)).toMatch(/^\d{3}\.\d{2}$/);
  });
});
