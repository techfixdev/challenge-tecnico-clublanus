import "server-only";

import type { CardBrand } from "@/features/account/domain/card";
import { Prisma } from "@/generated/prisma/client";
import { CURRENCIES } from "@/shared/lib/currency";
import { db } from "@/shared/lib/db";
import { containsPattern, LIKE_ESCAPE_CHAR } from "@/shared/lib/like-pattern";

import type { Movement } from "../domain/movement";
import type { MovementCursor } from "../domain/movement-cursor";
import type { MovementFilters } from "../domain/movement-search-params";
import type {
  MovementCountQuery,
  MovementListQuery,
  MovementRepository,
} from "../domain/movement-queries";
import type {
  MovementTotalsQuery,
  MovementTotalsRepository,
} from "../domain/movement-summary";

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

/** Position in the app's currency order; currencies the app does not list go last. */
function currencyRank(code: string): number {
  const index = (CURRENCIES as readonly string[]).indexOf(code);
  return index === -1 ? CURRENCIES.length : index;
}

function byCurrencyOrder(a: string, b: string): number {
  return currencyRank(a) - currencyRank(b) || a.localeCompare(b);
}

/**
 * Owner scope + type + accent- and case-insensitive search (counterparty OR description).
 *
 * Written in SQL because Prisma's `contains`/`mode: "insensitive"` cannot ignore accents.
 * `immutable_unaccent` (see its migration) is the exact expression of the trigram indexes on
 * both columns: any other spelling of the predicate would leave them unused.
 * Every value is a bound parameter of the `Prisma.sql` tagged template (never string
 * concatenation), and the term is LIKE-escaped so "%" or "_" match literally.
 * Exported for the integration test that explains the search plan.
 */
export function whereClause(
  userId: string,
  { query, type }: MovementFilters,
  after?: MovementCursor,
): Prisma.Sql {
  const conditions = [Prisma.sql`m."userId" = ${userId}`];
  if (type) conditions.push(Prisma.sql`m."type" = ${type}::"MovementType"`);
  if (query) {
    const pattern = containsPattern(query);
    conditions.push(
      Prisma.sql`(immutable_unaccent(m."counterparty") ILIKE immutable_unaccent(${pattern}) ESCAPE ${LIKE_ESCAPE_CHAR}
        OR immutable_unaccent(m."description") ILIKE immutable_unaccent(${pattern}) ESCAPE ${LIKE_ESCAPE_CHAR})`,
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

export const prismaMovementRepository: MovementRepository &
  MovementTotalsRepository = {
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
      select: {
        ...movementSelect,
        transfer: { select: { recipient: { select: { alias: true } } } },
      },
    });
    if (!row) return null;
    const { transfer, ...movement } = row;
    // Only the sender's side names someone to send to again (on the RECEIVED side the
    // transfer's recipient is the user).
    const recipientAlias =
      movement.type === "SENT" ? (transfer?.recipient.alias ?? null) : null;
    return { ...toMovement(movement), recipientAlias };
  },

  /**
   * The cards' currencies, primary first, then any other currency the user has movements
   * in (e.g. from a card deleted since), in the app's currency order.
   */
  async currenciesOf(userId: string) {
    const [cards, movements] = await Promise.all([
      db.card.findMany({
        where: { userId },
        select: { currency: true },
        orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
      }),
      db.movement.findMany({
        where: { userId },
        distinct: ["currency"],
        select: { currency: true },
      }),
    ]);
    const cardCurrencies = cards.map((card) => card.currency);
    const movementCurrencies = movements
      .map((movement) => movement.currency)
      .sort(byCurrencyOrder);
    return [...new Set([...cardCurrencies, ...movementCurrencies])];
  },

  /**
   * The database adds the amounts (`SUM` over `Decimal(12,2)`), so the totals are exact;
   * they leave as fixed 2-decimal strings, like every amount in the app.
   */
  async sumByType({ userId, status, currency, from, to }: MovementTotalsQuery) {
    const rows = await db.movement.groupBy({
      by: ["type"],
      where: { userId, status, currency, occurredAt: { gte: from, lt: to } },
      _sum: { amount: true },
    });
    return Object.fromEntries(
      rows.map((row) => [row.type, (row._sum.amount ?? 0).toFixed(2)]),
    );
  },
};
