/**
 * Account cards: the balance carousel on Home and the card shown on a movement detail.
 * Framework-free; the Prisma repository maps rows into these shapes.
 */

export const CARD_BRANDS = ["MASTERCARD", "VISA"] as const;
export type CardBrand = (typeof CARD_BRANDS)[number];

export const CARD_BRAND_LABEL: Record<CardBrand, string> = {
  MASTERCARD: "Mastercard",
  VISA: "Visa",
};

export type Card = {
  id: string;
  brand: CardBrand;
  last4: string;
  holderName: string;
  expMonth: number;
  expYear: number;
  /** Decimal serialized as a fixed 2-decimal string (never a float). */
  balance: string;
  currency: string;
  isPrimary: boolean;
};

export interface CardRepository {
  findByUserId(userId: string): Promise<Card[]>;
}

/**
 * What a card prints, without its balance. Home renders cards from this shape, so the
 * balance (like the full number and the CVV) never reaches the page until the user
 * reveals that card.
 */
export type CardFace = Omit<Card, "balance">;

export function toCardFace(card: Card): CardFace {
  return {
    id: card.id,
    brand: card.brand,
    last4: card.last4,
    holderName: card.holderName,
    expMonth: card.expMonth,
    expYear: card.expYear,
    currency: card.currency,
    isPrimary: card.isPrimary,
  };
}

/** The data a card keeps masked until its owner reveals it. */
export type CardDetails = {
  id: string;
  /**
   * Full card number, digits only; null when the card has no stored number (a row from
   * before the demo PANs were seeded). The balance and CVV are still revealed.
   */
  number: string | null;
  /** Display-only CVV, derived on the server (never stored). */
  cvv: string;
  balance: string;
  currency: string;
};

export type CardDetailsRecord = {
  id: string;
  pan: string | null;
  balance: string;
  currency: string;
};

export interface CardDetailsRepository {
  /** The card if `userId` owns it, else null (another user's card looks unknown). */
  findDetailsById(
    userId: string,
    cardId: string,
  ): Promise<CardDetailsRecord | null>;
}

/** "MM/YY", as printed on the card in the design ("02/30"). */
export function formatCardExpiry(month: number, year: number): string {
  return `${String(month).padStart(2, "0")}/${String(year % 100).padStart(2, "0")}`;
}

/** The card inside a sentence, e.g. "tarjeta Mastercard terminada en 1234". */
export function cardPhrase(card: Pick<Card, "brand" | "last4">): string {
  return `tarjeta ${CARD_BRAND_LABEL[card.brand]} terminada en ${card.last4}`;
}

/** Accessible card name, e.g. "Tarjeta Mastercard terminada en 1234". */
export function describeCard(card: Pick<Card, "brand" | "last4">): string {
  return `T${cardPhrase(card).slice(1)}`;
}

/** Primary card first (it is the one the design shows in front), stable otherwise. */
function sortCardsPrimaryFirst(cards: readonly Card[]): Card[] {
  return [...cards].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

/** Use case: the signed-in user's cards, scoped by user id, primary first. */
export async function getAccountCards(
  repository: CardRepository,
  userId: string,
): Promise<Card[]> {
  return sortCardsPrimaryFirst(await repository.findByUserId(userId));
}

/**
 * Use case: reveal one of the signed-in user's cards. The lookup is scoped by owner, so
 * another user's card id answers null like an unknown one. The CVV is derived, not read.
 * A card without a stored number still reveals its balance and CVV (`number: null`).
 */
export async function revealCardDetails(
  repository: CardDetailsRepository,
  userId: string,
  cardId: string,
  deriveCvv: (cardId: string) => string,
): Promise<CardDetails | null> {
  const record = await repository.findDetailsById(userId, cardId);
  if (!record) return null;
  return {
    id: record.id,
    number: record.pan,
    cvv: deriveCvv(record.id),
    balance: record.balance,
    currency: record.currency,
  };
}
