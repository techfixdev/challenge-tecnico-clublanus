import { describe, expect, it, vi } from "vitest";

import {
  describeCard,
  formatCardExpiry,
  getAccountCards,
  type Card,
  type CardRepository,
} from "./card";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card_1",
    brand: "MASTERCARD",
    last4: "1234",
    holderName: "Soy Granate",
    expMonth: 2,
    expYear: 2030,
    balance: "978.85",
    currency: "USD",
    isPrimary: true,
    ...overrides,
  };
}

describe("formatCardExpiry", () => {
  it("prints MM/YY as on the card in the design", () => {
    expect(formatCardExpiry(2, 2030)).toBe("02/30");
    expect(formatCardExpiry(11, 2028)).toBe("11/28");
    expect(formatCardExpiry(1, 2005)).toBe("01/05");
  });
});

describe("describeCard", () => {
  it("gives screen readers the brand and last four digits", () => {
    expect(describeCard(makeCard())).toBe(
      "Tarjeta Mastercard terminada en 1234",
    );
    expect(describeCard(makeCard({ brand: "VISA", last4: "5678" }))).toBe(
      "Tarjeta Visa terminada en 5678",
    );
  });
});

describe("getAccountCards", () => {
  it("loads the cards of the given user only, primary card first", async () => {
    const visa = makeCard({ id: "visa", brand: "VISA", isPrimary: false });
    const mastercard = makeCard({ id: "mc", isPrimary: true });
    const repository: CardRepository = {
      findByUserId: vi.fn(async () => [visa, mastercard]),
    };

    const cards = await getAccountCards(repository, "user_1");

    expect(repository.findByUserId).toHaveBeenCalledWith("user_1");
    expect(cards.map((card) => card.id)).toEqual(["mc", "visa"]);
  });

  it("returns an empty list when the user has no cards", async () => {
    const repository: CardRepository = { findByUserId: vi.fn(async () => []) };

    await expect(getAccountCards(repository, "user_1")).resolves.toEqual([]);
  });
});
