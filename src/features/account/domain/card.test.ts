import { describe, expect, it, vi } from "vitest";

import {
  cardPhrase,
  describeCard,
  formatCardExpiry,
  getAccountCards,
  revealCardDetails,
  toCardFace,
  type Card,
  type CardDetailsRepository,
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

describe("card faces (what Home renders before any reveal)", () => {
  it("drops the balance, keeps what the card prints", () => {
    const face = toCardFace(makeCard());

    expect(face).not.toHaveProperty("balance");
    expect(face).toEqual({
      id: "card_1",
      brand: "MASTERCARD",
      last4: "1234",
      holderName: "Soy Granate",
      expMonth: 2,
      expYear: 2030,
      currency: "USD",
      isPrimary: true,
    });
  });

  it("names the card in a sentence, lowercase", () => {
    expect(cardPhrase({ brand: "VISA", last4: "5678" })).toBe(
      "tarjeta Visa terminada en 5678",
    );
  });
});

describe("revealCardDetails", () => {
  const record = {
    id: "card_1",
    pan: "5412751234561234",
    balance: "978.85",
    currency: "USD",
  };

  it("returns the owner's card number, derived CVV and balance", async () => {
    const repository: CardDetailsRepository = {
      findDetailsById: vi.fn().mockResolvedValue(record),
    };
    const deriveCvv = vi.fn().mockReturnValue("042");

    await expect(
      revealCardDetails(repository, "user_1", "card_1", deriveCvv),
    ).resolves.toEqual({
      id: "card_1",
      number: "5412751234561234",
      cvv: "042",
      balance: "978.85",
      currency: "USD",
    });
    expect(repository.findDetailsById).toHaveBeenCalledWith("user_1", "card_1");
    expect(deriveCvv).toHaveBeenCalledWith("card_1");
  });

  it("returns null for a card the user does not own (scoped lookup)", async () => {
    const repository: CardDetailsRepository = {
      findDetailsById: vi.fn().mockResolvedValue(null),
    };

    await expect(
      revealCardDetails(repository, "user_1", "card_x", () => "000"),
    ).resolves.toBeNull();
  });

  it("still reveals balance and CVV when the card has no stored number", async () => {
    const repository: CardDetailsRepository = {
      findDetailsById: vi.fn().mockResolvedValue({ ...record, pan: null }),
    };

    await expect(
      revealCardDetails(repository, "user_1", "card_1", () => "042"),
    ).resolves.toEqual({
      id: "card_1",
      number: null,
      cvv: "042",
      balance: "978.85",
      currency: "USD",
    });
  });
});
