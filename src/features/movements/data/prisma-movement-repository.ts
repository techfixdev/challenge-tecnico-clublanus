import "server-only";

import type { CardBrand } from "@/features/account/domain/card";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/shared/lib/db";
import { containsPattern, LIKE_ESCAPE_CHAR } from "@/shared/lib/like-pattern";

import type { Movement } from "../domain/movement";
import type { MovementCursor } from "../domain/movement-cursor";
import type { MovementFilters } from "../domain/movement-filters";
import type {
  MovementCountQuery,
  MovementListQuery,
  MovementRepository,
} from "../domain/movement-queries";

const movementSelect = {
  id: true,
  counterparty: true,
  description: true,
  type: true,
  status: true,
  amount: true,
  currency: true,
  reference: true,
  occurredAt: true,
  card: { select: { brand: true, last4: true } },
} satisfies Prisma.MovementSelect;

type MovementRow = Prisma.MovementGetPayload<{ select: typeof movementSelect }>;

function toMovement(row: MovementRow): Movement {
  // Decimal -> fixed 2-decimal string: exact, and safe to serialize to the client.
  return { ...row, amount: row.amount.toFixed(2) };
}

type MovementSqlRow = Omit<MovementRow, "card"> & {
  cardBrand: CardBrand | null;
  cardLast4: string | null;
};

function fromSqlRow({
  cardBrand,
  cardLast4,
  ...row
}: MovementSqlRow): Movement {
  const card =
    cardBrand && cardLast4 ? { brand: cardBrand, last4: cardLast4 } : null;
  return toMovement({ ...row, card });
}

/**
 * Owner scope + type + accent- and case-insensitive search (counterparty OR description).
 *
 * Written in SQL because Prisma's `contains`/`mode: "insensitive"` cannot ignore accents.
 * Every value is a bound parameter of the `Prisma.sql` tagged template (never string
 * concatenation), and the term is LIKE-escaped so "%" or "_" match literally.
 */
function whereClause(
  userId: string,
  { query, type }: MovementFilters,
  after?: MovementCursor,
): Prisma.Sql {
  const conditions = [Prisma.sql`m."userId" = ${userId}`];
  if (type) conditions.push(Prisma.sql`m."type" = ${type}::"MovementType"`);
  if (query) {
    const pattern = containsPattern(query);
    conditions.push(
      Prisma.sql`(unaccent(m."counterparty") ILIKE unaccent(${pattern}) ESCAPE ${LIKE_ESCAPE_CHAR}
        OR unaccent(m."description") ILIKE unaccent(${pattern}) ESCAPE ${LIKE_ESCAPE_CHAR})`,
    );
  }
  if (after) {
    // Keyset pagination: rows strictly after the cursor in `occurredAt desc, id desc` order.
    conditions.push(
      Prisma.sql`(m."occurredAt", m."id") < (${after.occurredAt}::timestamp, ${after.id})`,
    );
  }
  return Prisma.join(conditions, " AND ");
}

export const prismaMovementRepository: MovementRepository = {
  async findMany({ userId, filters, after, take }: MovementListQuery) {
    const rows = await db.$queryRaw<MovementSqlRow[]>`
      SELECT m."id", m."counterparty", m."description", m."type", m."status", m."amount",
             m."currency", m."reference", m."occurredAt",
             c."brand" AS "cardBrand", c."last4" AS "cardLast4"
      FROM "Movement" m
      LEFT JOIN "Card" c ON c."id" = m."cardId"
      WHERE ${whereClause(userId, filters, after)}
      ORDER BY m."occurredAt" DESC, m."id" DESC
      LIMIT ${take}`;
    return rows.map(fromSqlRow);
  },

  async count({ userId, filters }: MovementCountQuery) {
    const [{ total }] = await db.$queryRaw<[{ total: number }]>`
      SELECT COUNT(*)::int AS "total" FROM "Movement" m
      WHERE ${whereClause(userId, filters)}`;
    return total;
  },

  async findById(userId: string, id: string) {
    // `findFirst` with both id and owner: another user's id is indistinguishable from a
    // missing one, so the detail page returns 404 and never confirms the id exists.
    const row = await db.movement.findFirst({
      where: { id, userId },
      select: movementSelect,
    });
    return row ? toMovement(row) : null;
  },
};
