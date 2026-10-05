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

/** "MM/YY", as printed on the card in the design ("02/30"). */
export function formatCardExpiry(month: number, year: number): string {
  return `${String(month).padStart(2, "0")}/${String(year % 100).padStart(2, "0")}`;
}

/** Accessible card name, e.g. "Tarjeta Mastercard terminada en 1234". */
export function describeCard(card: Pick<Card, "brand" | "last4">): string {
  return `Tarjeta ${CARD_BRAND_LABEL[card.brand]} terminada en ${card.last4}`;
}

/** Primary card first (it is the one the design shows in front), stable otherwise. */
export function sortCardsPrimaryFirst(cards: readonly Card[]): Card[] {
  return [...cards].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

/** Use case: the signed-in user's cards, scoped by user id, primary first. */
export async function getAccountCards(
  repository: CardRepository,
  userId: string,
): Promise<Card[]> {
  return sortCardsPrimaryFirst(await repository.findByUserId(userId));
}
