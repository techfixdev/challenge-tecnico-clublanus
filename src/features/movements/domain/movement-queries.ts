import { z } from "zod";

import type { Movement } from "./movement";
import { encodeMovementCursor, type MovementCursor } from "./movement-cursor";
import type { MovementFilters } from "./movement-filters";

/**
 * Movement use cases. The repository is injected (hexagonal port), so the rules here are
 * unit-tested with fakes; the Prisma adapter lives in `../data`.
 *
 * Every query takes the owner's `userId`: there is no way to read a movement without it,
 * which is what prevents one user from reading another's data by guessing ids (IDOR).
 */

export type MovementCountQuery = { userId: string; filters: MovementFilters };

export type MovementListQuery = MovementCountQuery & {
  /** Keyset position: return rows strictly older than this one. */
  after?: MovementCursor;
  take: number;
};

export interface MovementRepository {
  /** Newest first (`occurredAt desc, id desc`). */
  findMany(query: MovementListQuery): Promise<Movement[]>;
  count(query: MovementCountQuery): Promise<number>;
  /** Must match both the id and the owner; a foreign id behaves as "not found". */
  findById(userId: string, id: string): Promise<Movement | null>;
}

export const MOVEMENTS_PAGE_SIZE = 20;
export const LATEST_MOVEMENTS_LIMIT = 5;

export type MovementPage = {
  items: Movement[];
  /** Total matches for the filters (all pages), for the result count. */
  total: number;
  /** Opaque cursor for the next page, or `null` on the last one. */
  nextCursor: string | null;
};

export async function listMovements(
  repository: MovementRepository,
  userId: string,
  {
    filters = {},
    cursor,
    pageSize = MOVEMENTS_PAGE_SIZE,
  }: {
    filters?: MovementFilters;
    cursor?: MovementCursor;
    pageSize?: number;
  } = {},
): Promise<MovementPage> {
  // One extra row tells us whether another page exists, without a second query.
  const [rows, total] = await Promise.all([
    repository.findMany({ userId, filters, after: cursor, take: pageSize + 1 }),
    repository.count({ userId, filters }),
  ]);

  const items = rows.slice(0, pageSize);
  const last = items.at(-1);
  const hasMore = rows.length > pageSize;

  return {
    items,
    total,
    nextCursor: hasMore && last ? encodeMovementCursor(last) : null,
  };
}

export function getLatestMovements(
  repository: MovementRepository,
  userId: string,
  limit = LATEST_MOVEMENTS_LIMIT,
): Promise<Movement[]> {
  return repository.findMany({ userId, filters: {}, take: limit });
}

const movementIdSchema = z.cuid();

/** `null` for malformed ids, unknown ids and other users' movements alike. */
export async function getMovement(
  repository: MovementRepository,
  userId: string,
  id: string,
): Promise<Movement | null> {
  if (!movementIdSchema.safeParse(id).success) return null;
  return repository.findById(userId, id);
}
