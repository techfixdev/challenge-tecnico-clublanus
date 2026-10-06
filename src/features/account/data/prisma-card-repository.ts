import "server-only";

import { db } from "@/shared/lib/db";

import type { CardDetailsRepository, CardRepository } from "../domain/card";

export const prismaCardRepository: CardRepository = {
  async findByUserId(userId: string) {
    const rows = await db.card.findMany({
      where: { userId },
      orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
      select: {
        id: true,
        brand: true,
        last4: true,
        holderName: true,
        expMonth: true,
        expYear: true,
        balance: true,
        currency: true,
        isPrimary: true,
      },
    });
    // Decimal -> fixed 2-decimal string: exact, and safe to serialize to the client.
    return rows.map((row) => ({ ...row, balance: row.balance.toFixed(2) }));
  },
};

/** The sensitive columns, read only for an explicit reveal and scoped to the owner. */
export const prismaCardDetailsRepository: CardDetailsRepository = {
  async findDetailsById(userId: string, cardId: string) {
    const row = await db.card.findFirst({
      where: { id: cardId, userId },
      select: { id: true, pan: true, balance: true, currency: true },
    });
    return row && { ...row, balance: row.balance.toFixed(2) };
  },
};
