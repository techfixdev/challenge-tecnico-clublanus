import { describe, expect, it } from "vitest";

import { CARD_BRANDS } from "../domain/card";
import { BRAND_THEME } from "./card-theme";

describe("BRAND_THEME chip", () => {
  it("is gold with gold ink on the granate Mastercard", () => {
    const { card, chip } = BRAND_THEME.MASTERCARD;

    expect(card).toContain("bg-primary");
    expect(chip).toContain("to-gold");
    expect(chip).toContain("text-gold-ink");
  });

  it("is granate with white text on the gold Visa", () => {
    const { card, chip } = BRAND_THEME.VISA;

    expect(card).toContain("bg-card-gold");
    expect(chip).toContain("to-primary");
    expect(chip).toContain("text-white");
  });

  it("always takes the other club color than the card it sits on", () => {
    for (const brand of CARD_BRANDS) {
      const { card, chip } = BRAND_THEME[brand];
      const cardIsGranate = card.startsWith("bg-primary");

      expect(chip.includes("gold")).toBe(cardIsGranate);
    }
  });
});
