import { describe, expect, it } from "vitest";

import { fromCents, parseAmount, parseCanonicalAmount, toCents } from "./money";

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

  it("is exact where floating point is not (0.1 + 0.2)", () => {
    const sum =
      (parseAmount("0.1")?.cents ?? 0) + (parseAmount("0.2")?.cents ?? 0);
    expect(fromCents(sum)).toBe("0.30");
  });

  describe("Argentine format", () => {
    it.each([
      ["12,30", "12.30"],
      ["12,3", "12.30"],
      ["1234,56", "1234.56"],
      ["1.234,56", "1234.56"],
      ["312.400,50", "312400.50"],
      ["100.000.000,00", "100000000.00"],
      ["0,05", "0.05"],
    ])("reads %j as %s (one comma: the decimal separator)", (input, amount) => {
      expect(parseAmount(input)?.amount).toBe(amount);
    });

    it.each([
      ["1.234", "1234.00"],
      ["12.300", "12300.00"],
      ["10.555", "10555.00"],
      ["1.234.567", "1234567.00"],
    ])(
      "reads %j as %s (dots before 3 digits group thousands)",
      (input, amount) => {
        expect(parseAmount(input)?.amount).toBe(amount);
      },
    );
  });

  describe("plain decimals with a dot", () => {
    it.each([
      ["12.30", "12.30"],
      ["12.3", "12.30"],
      ["1234.5", "1234.50"],
      ["0.99", "0.99"],
    ])(
      "reads %j as %s (a dot before 1 or 2 digits is the decimal point)",
      (input, amount) => {
        expect(parseAmount(input)?.amount).toBe(amount);
      },
    );

    it("never reads a JSON number's dot as a thousands separator", () => {
      expect(parseAmount(1.5)).toEqual({ amount: "1.50", cents: 150 });
      // 1.234 as a number is one dollar and change, not 1234: too many decimals.
      expect(parseAmount(1.234)).toBeNull();
    });
  });

  it.each([
    ["", "empty"],
    ["abc", "not a number"],
    ["-5", "negative"],
    ["1e3", "exponent"],
    ["Infinity", "not finite"],
    ["10.", "half-typed decimal point"],
    ["12,", "half-typed decimal comma"],
    [".5", "no integer part"],
    [",5", "no integer part"],
    ["10,555", "3 decimals after a comma"],
    ["1,234", "a comma as thousands separator (en-US) is ambiguous"],
    ["1,234.56", "en-US grouping"],
    ["1,2,3", "two commas"],
    ["1.2.3", "dots that do not group thousands"],
    ["1.23.456", "uneven groups"],
    ["1234.567", "a group without its leading dot pattern"],
    ["1.2345", "a 4-digit group"],
    ["0.123", "a thousands group after a leading zero"],
    ["1.234,", "half-typed decimals"],
    ["1 234", "spaces inside"],
    ["12345678901", "more than 10 integer digits"],
    ["12.345.678.901", "more than 10 integer digits, grouped"],
  ])("rejects %j (%s)", (input) => {
    expect(parseAmount(input)).toBeNull();
  });

  it("rejects numbers that are not plain decimals", () => {
    expect(parseAmount(Number.NaN)).toBeNull();
    expect(parseAmount(1e21)).toBeNull();
    expect(parseAmount(10.005)).toBeNull();
    expect(parseAmount(-1)).toBeNull();
  });
});

describe("parseCanonicalAmount (machine input: the REST API)", () => {
  it.each([
    ["10.55", "10.55", 1055],
    ["12500", "12500.00", 1250000],
    ["0.5", "0.50", 50],
    ["9999999999.99", "9999999999.99", 999999999999],
  ])("reads the plain decimal %j", (input, amount, cents) => {
    expect(parseCanonicalAmount(input)).toEqual({ amount, cents });
  });

  it("reads a JSON number through its shortest decimal form", () => {
    expect(parseCanonicalAmount(10.55)).toEqual({
      amount: "10.55",
      cents: 1055,
    });
    expect(parseCanonicalAmount(12500)).toEqual({
      amount: "12500.00",
      cents: 1250000,
    });
  });

  // Never the Argentine thousands rule: "12.500" is no 12500 for a machine.
  it.each([
    "10.555",
    "12.500",
    "1.234",
    "1.234,56",
    "12,30",
    " 10.55",
    "10.",
    ".5",
    "+1",
    "-1",
    "1e3",
    "12345678901",
    "",
  ])("rejects %j", (input) => {
    expect(parseCanonicalAmount(input)).toBeNull();
  });

  it("rejects numbers that are not plain decimals", () => {
    expect(parseCanonicalAmount(Number.NaN)).toBeNull();
    expect(parseCanonicalAmount(1e21)).toBeNull();
    expect(parseCanonicalAmount(10.555)).toBeNull();
    expect(parseCanonicalAmount(-1)).toBeNull();
  });
});
