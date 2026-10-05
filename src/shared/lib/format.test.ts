import { describe, expect, it } from "vitest";

import { formatAmount, formatMoney } from "./format";

describe("formatMoney", () => {
  it("omits decimals for whole amounts, as in the movement list design", () => {
    expect(formatMoney(125)).toBe("$125");
    expect(formatMoney(95)).toBe("$95");
  });

  it("keeps two decimals for fractional amounts", () => {
    expect(formatMoney(978.85)).toBe("$978.85");
    expect(formatMoney(12.5)).toBe("$12.50");
  });

  it("groups thousands with a comma", () => {
    expect(formatMoney(1250000.5)).toBe("$1,250,000.50");
  });

  it("accepts decimal strings and Decimal-like values from the ORM", () => {
    expect(formatMoney("978.85")).toBe("$978.85");
    expect(formatMoney({ toNumber: () => 125 })).toBe("$125");
  });

  it("formats negative amounts with a leading minus sign", () => {
    expect(formatMoney(-95)).toBe("-$95");
  });

  it("rejects non-finite input", () => {
    expect(() => formatMoney("abc")).toThrow(RangeError);
    expect(() => formatMoney(Number.NaN)).toThrow(RangeError);
  });
});

describe("formatAmount", () => {
  it("formats without the currency symbol for the balance card", () => {
    expect(formatAmount(978.85)).toBe("978.85");
    expect(formatAmount(1000)).toBe("1,000");
  });
});
