import { describe, expect, it } from "vitest";

import { fromCents, parseAmount, toCents } from "./money";

describe("toCents / fromCents", () => {
  it("round-trips fixed decimal strings exactly", () => {
    expect(toCents("123.45")).toBe(12345);
    expect(toCents("-0.5")).toBe(-50);
    expect(toCents("7")).toBe(700);
    expect(fromCents(12345)).toBe("123.45");
    expect(fromCents(-50)).toBe("-0.50");
    expect(fromCents(700)).toBe("7.00");
  });

  it("refuses totals outside the exact integer range", () => {
    expect(() => fromCents(Number.MAX_SAFE_INTEGER + 2)).toThrow(RangeError);
  });
});

describe("parseAmount", () => {
  it("accepts a positive amount with up to 2 decimals, as a string or a number", () => {
    expect(parseAmount("10")).toEqual({ amount: "10.00", cents: 1000 });
    expect(parseAmount(" 0.5 ")).toEqual({ amount: "0.50", cents: 50 });
    expect(parseAmount(95.25)).toEqual({ amount: "95.25", cents: 9525 });
  });

  it("accepts a decimal comma, as typed on a Spanish keyboard", () => {
    expect(parseAmount("12,30")).toEqual({ amount: "12.30", cents: 1230 });
  });

  it("is exact where floating point is not (0.1 + 0.2)", () => {
    const sum =
      (parseAmount("0.1")?.cents ?? 0) + (parseAmount("0.2")?.cents ?? 0);
    expect(fromCents(sum)).toBe("0.30");
  });

  it.each([
    "",
    "abc",
    "1.234",
    "1.234,56",
    "-5",
    "1e3",
    "10.",
    ".5",
    "Infinity",
    "12345678901",
  ])("rejects %j", (input) => {
    expect(parseAmount(input)).toBeNull();
  });

  it("rejects numbers that are not plain decimals", () => {
    expect(parseAmount(Number.NaN)).toBeNull();
    expect(parseAmount(1e21)).toBeNull();
    expect(parseAmount(10.005)).toBeNull();
  });
});
