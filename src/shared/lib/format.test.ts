import { describe, expect, it } from "vitest";

import {
  formatAmount,
  formatMoney,
  formatMoneyForSpeech,
  formatSignedMoney,
  formatSignedMoneyForSpeech,
} from "./format";

// The symbol and the number are joined by a no-break space, so they never wrap apart.
const NBSP = " ";

describe("formatMoney", () => {
  it("writes both currencies in the Argentine format, with their own symbol", () => {
    expect(formatMoney("312400.50", "ARS")).toBe(`$${NBSP}312.400,50`);
    expect(formatMoney("978.85", "USD")).toBe(`US$${NBSP}978,85`);
  });

  it("omits decimals for whole amounts, as in the movement list design", () => {
    expect(formatMoney(125, "USD")).toBe(`US$${NBSP}125`);
    expect(formatMoney("11999.00", "ARS")).toBe(`$${NBSP}11.999`);
  });

  it("keeps two decimals for fractional amounts", () => {
    expect(formatMoney(12.5, "USD")).toBe(`US$${NBSP}12,50`);
    expect(formatMoney("0.05", "ARS")).toBe(`$${NBSP}0,05`);
  });

  it("groups every thousand with a dot, four-digit amounts included", () => {
    expect(formatMoney(1234, "USD")).toBe(`US$${NBSP}1.234`);
    expect(formatMoney("1250000.5", "ARS")).toBe(`$${NBSP}1.250.000,50`);
    expect(formatMoney("100000000.00", "ARS")).toBe(`$${NBSP}100.000.000`);
  });

  it("accepts decimal strings and Decimal-like values from the ORM", () => {
    expect(formatMoney({ toFixed: () => "125.00" }, "USD")).toBe(
      `US$${NBSP}125`,
    );
  });

  it("formats negative amounts with a leading minus sign", () => {
    expect(formatMoney(-95, "USD")).toBe(`-US$${NBSP}95`);
    expect(formatMoney("-1234.5", "ARS")).toBe(`-$${NBSP}1.234,50`);
  });

  it("rounds to the cent, half away from zero, without floating-point drift", () => {
    expect(formatMoney("10.005", "USD")).toBe(`US$${NBSP}10,01`);
    expect(formatMoney("10.004", "USD")).toBe(`US$${NBSP}10`);
    expect(formatMoney("-10.005", "USD")).toBe(`-US$${NBSP}10,01`);
  });

  it("falls back to the ISO code for a currency it has no symbol for", () => {
    expect(formatMoney("10.50", "EUR")).toBe(`EUR${NBSP}10,50`);
  });

  it("rejects non-finite input", () => {
    expect(() => formatMoney("abc", "USD")).toThrow(RangeError);
    expect(() => formatMoney(Number.NaN, "USD")).toThrow(RangeError);
    expect(() => formatMoney(Number.POSITIVE_INFINITY, "USD")).toThrow(
      RangeError,
    );
  });

  it("rejects empty or whitespace-only strings instead of formatting them as $0", () => {
    expect(() => formatMoney("", "USD")).toThrow(RangeError);
    expect(() => formatMoney("   ", "ARS")).toThrow(RangeError);
    expect(() => formatAmount("")).toThrow(RangeError);
  });
});

describe("formatAmount", () => {
  it("formats without the currency symbol for the balance card", () => {
    expect(formatAmount("978.85")).toBe("978,85");
    expect(formatAmount("312400.50")).toBe("312.400,50");
    expect(formatAmount(1000)).toBe("1.000");
  });

  it("can force the decimals, so a value keeps its width while it changes", () => {
    expect(formatAmount(512.3, { fractionDigits: 2 })).toBe("512,30");
    expect(formatAmount(1000, { fractionDigits: 2 })).toBe("1.000,00");
    expect(formatAmount(978.854, { fractionDigits: 0 })).toBe("979");
    expect(formatAmount("978.49", { fractionDigits: 0 })).toBe("978");
  });

  it("never writes a minus sign for an amount that rounds to zero", () => {
    expect(formatAmount("-0.004")).toBe("0");
    expect(formatAmount("-0.4", { fractionDigits: 0 })).toBe("0");
  });
});

describe("formatMoneyForSpeech", () => {
  it("names the currency in words, so a screen reader never says 'U S dollar sign'", () => {
    expect(formatMoneyForSpeech("978.85", "USD")).toBe("978,85 dólares");
    expect(formatMoneyForSpeech("312400.50", "ARS")).toBe("312.400,50 pesos");
  });

  it("uses the singular for exactly one unit and words the minus sign", () => {
    expect(formatMoneyForSpeech("1.00", "USD")).toBe("1 dólar");
    expect(formatMoneyForSpeech("1", "ARS")).toBe("1 peso");
    expect(formatMoneyForSpeech("-95", "USD")).toBe("menos 95 dólares");
  });

  it("keeps the ISO code for a currency it cannot name", () => {
    expect(formatMoneyForSpeech("10", "EUR")).toBe("10 EUR");
  });
});

describe("formatSignedMoney", () => {
  it("signs money in with + and money out with a minus sign (U+2212)", () => {
    expect(formatSignedMoney("95.00", "USD", "in")).toBe(`+US$${NBSP}95`);
    expect(formatSignedMoney("11999", "ARS", "out")).toBe(
      `\u2212$${NBSP}11.999`,
    );
  });

  it("leaves zero unsigned", () => {
    expect(formatSignedMoney("0.00", "USD", "in")).toBe(`US$${NBSP}0`);
    expect(formatSignedMoneyForSpeech("0.00", "ARS", "out")).toBe("0 pesos");
  });

  it("words the direction for screen readers", () => {
    expect(formatSignedMoneyForSpeech("95", "USD", "in")).toBe(
      "más 95 dólares",
    );
    expect(formatSignedMoneyForSpeech("1250.5", "ARS", "out")).toBe(
      "menos 1.250,50 pesos",
    );
  });
});
