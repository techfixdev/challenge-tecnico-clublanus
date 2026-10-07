import { describe, expect, it } from "vitest";

import {
  buildDemoPan,
  formatCardNumber,
  formatMaskedCardNumber,
  isLuhnValid,
  isMaskedGroup,
} from "./card-number";

describe("isLuhnValid", () => {
  it.each([
    "4111111111111111",
    "5555555555554444",
    "4012888888881881",
    "79927398713",
  ])("accepts the published test number %s", (digits) => {
    expect(isLuhnValid(digits)).toBe(true);
  });

  it.each(["4111111111111112", "5555555555554443", "79927398710"])(
    "rejects %s (one digit off)",
    (digits) => {
      expect(isLuhnValid(digits)).toBe(false);
    },
  );

  it("rejects anything that is not only digits", () => {
    expect(isLuhnValid("")).toBe(false);
    expect(isLuhnValid("4111 1111 1111 1111")).toBe(false);
    expect(isLuhnValid("411111111111111a")).toBe(false);
  });
});

describe("buildDemoPan", () => {
  const DEMO_CARDS = [
    ["MASTERCARD", "1234"],
    ["VISA", "5678"],
    ["VISA", "1910"],
    ["MASTERCARD", "1915"],
  ] as const;

  it.each(DEMO_CARDS)(
    "builds a 16-digit, Luhn-valid %s number ending in %s",
    (brand, last4) => {
      const pan = buildDemoPan(brand, last4, `seed-${brand}-${last4}`);

      expect(pan).toMatch(/^\d{16}$/);
      expect(pan.endsWith(last4)).toBe(true);
      expect(isLuhnValid(pan)).toBe(true);
    },
  );

  it("starts with the brand's leading digit (Visa 4, Mastercard 5)", () => {
    expect(buildDemoPan("VISA", "5678", "a")).toMatch(/^4/);
    expect(buildDemoPan("MASTERCARD", "1234", "a")).toMatch(/^5[1-5]/);
  });

  it("is deterministic per seed, so re-running the seed keeps the same number", () => {
    expect(buildDemoPan("VISA", "5678", "demo")).toBe(
      buildDemoPan("VISA", "5678", "demo"),
    );
    expect(buildDemoPan("VISA", "5678", "demo")).not.toBe(
      buildDemoPan("VISA", "5678", "other"),
    );
  });

  it("refuses a last4 that is not four digits", () => {
    expect(() => buildDemoPan("VISA", "567", "a")).toThrow();
    expect(() => buildDemoPan("VISA", "56a8", "a")).toThrow();
  });
});

describe("formatCardNumber", () => {
  it("groups the number 4-4-4-4", () => {
    expect(formatCardNumber("5412751234561234")).toEqual([
      "5412",
      "7512",
      "3456",
      "1234",
    ]);
  });
});

describe("formatMaskedCardNumber", () => {
  it("masks the first twelve digits with bullets, grouped 4-4-4-4 like a printed card", () => {
    expect(formatMaskedCardNumber("1234")).toEqual([
      "••••",
      "••••",
      "••••",
      "1234",
    ]);
  });

  it("reads as a card number once joined, with no asterisks", () => {
    expect(formatMaskedCardNumber("5678").join(" ")).toBe(
      "•••• •••• •••• 5678",
    );
  });
});

describe("isMaskedGroup", () => {
  it("tells the bullet groups of a masked number from its visible last 4", () => {
    expect(formatMaskedCardNumber("1234").map(isMaskedGroup)).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it("never treats a group of digits as masked", () => {
    expect(formatCardNumber("4539578763621486").some(isMaskedGroup)).toBe(
      false,
    );
  });
});
