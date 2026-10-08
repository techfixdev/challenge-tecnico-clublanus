import "server-only";

import { db } from "@/shared/lib/db";

export type CardRevealEntry = {
  userId: string;
  cardId: string;
  ip: string | null;
};

/** Appends one row to the reveal audit log (`CardDetailsReveal`). */
export async function recordCardReveal(entry: CardRevealEntry): Promise<void> {
  await db.cardDetailsReveal.create({ data: entry });
}
