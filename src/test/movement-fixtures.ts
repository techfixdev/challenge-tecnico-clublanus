import type { Card } from "@/features/account/domain/card";
import type { Movement } from "@/features/movements/domain/movement";
import type { MovementRepository } from "@/features/movements/domain/movement-queries";

/** Test-only helpers: deterministic movements and an in-memory repository. */

export const OWNER_ID = "user_owner";
export const OTHER_USER_ID = "user_other";

let sequence = 0;

export function makeMovement(overrides: Partial<Movement> = {}): Movement {
  sequence += 1;
  return {
    id: `cmov${String(sequence).padStart(21, "0")}`,
    counterparty: "Adobe",
    description: "Pago de suscripción",
    type: "SUBSCRIPTION",
    status: "COMPLETED",
    amount: "125.00",
    currency: "USD",
    reference: `GB-${String(sequence).padStart(6, "0")}`,
    occurredAt: new Date(Date.UTC(2026, 9, 5, 12) - sequence * 60_000),
    card: { brand: "MASTERCARD", last4: "1234" },
    ...overrides,
  };
}

export function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card_mc",
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

type OwnedMovement = Movement & { userId: string };

/** Mirrors the Prisma adapter's semantics (owner scope, search, type, keyset order). */
export function createInMemoryMovementRepository(
  rows: OwnedMovement[],
): MovementRepository {
  const byNewest = [...rows].sort(
    (a, b) =>
      b.occurredAt.getTime() - a.occurredAt.getTime() ||
      b.id.localeCompare(a.id),
  );
  const strip = (row: OwnedMovement): Movement => {
    const movement: Movement & { userId?: string } = { ...row };
    delete movement.userId;
    return movement;
  };
  const matches = (
    row: OwnedMovement,
    userId: string,
    { query, type }: { query?: string; type?: Movement["type"] },
  ) =>
    row.userId === userId &&
    (!type || row.type === type) &&
    (!query ||
      `${row.counterparty} ${row.description}`
        .toLowerCase()
        .includes(query.toLowerCase()));

  return {
    async findMany({ userId, filters, after, take }) {
      return byNewest
        .filter((row) => matches(row, userId, filters))
        .filter(
          (row) =>
            !after ||
            row.occurredAt < after.occurredAt ||
            (row.occurredAt.getTime() === after.occurredAt.getTime() &&
              row.id < after.id),
        )
        .slice(0, take)
        .map(strip);
    },
    async count({ userId, filters }) {
      return byNewest.filter((row) => matches(row, userId, filters)).length;
    },
    async findById(userId, id) {
      const row = byNewest.find((r) => r.id === id && r.userId === userId);
      return row ? strip(row) : null;
    },
  };
}
