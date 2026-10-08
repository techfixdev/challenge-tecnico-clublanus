import "server-only";

import {
  decide,
  windowStartFor,
  type RateLimitDecision,
  type RateLimitPolicy,
} from "@/shared/lib/rate-limit";

/**
 * PostgreSQL-backed counters for the fixed-window policies in src/shared/lib/rate-limit.ts.
 * The database is the one place every serverless instance shares, so no Redis is needed.
 */

export type RateLimitScope = "login:email" | "login:ip" | "card:reveal";

/** Buckets whose window ended more than this long ago are deleted (longest window: 15 min). */
const STALE_AFTER_MS = 24 * 60 * 60_000;
/** Share of hits that also sweep stale buckets: cheap, and no cron job is needed. */
const SWEEP_PROBABILITY = 0.01;

type Options = { now?: Date; random?: () => number };

/**
 * The Prisma client, loaded on first use rather than at import: modules that merely sit
 * next to the limiter (e.g. `signOut` in the login service, used by the logout route) can
 * be imported without a configured database.
 */
async function database() {
  return (await import("@/shared/lib/db")).db;
}

/**
 * Counts one hit for `key` in `scope` and returns the verdict. The increment is a single
 * statement (`INSERT … ON CONFLICT DO UPDATE … RETURNING`): PostgreSQL locks the row for
 * the update, so N concurrent hits get the counts 1..N and exactly `limit` are allowed.
 * A refused hit is counted too (the count keeps growing; the verdict only needs `> limit`).
 */
export async function consumeRateLimit(
  scope: RateLimitScope,
  key: string,
  policy: RateLimitPolicy,
  { now = new Date(), random = Math.random }: Options = {},
): Promise<RateLimitDecision> {
  const windowStart = windowStartFor(now, policy);
  const db = await database();
  const [{ count }] = await db.$queryRaw<[{ count: number }]>`
    INSERT INTO "RateLimitBucket" ("scope", "key", "windowStart", "count")
    VALUES (${scope}, ${key}, ${windowStart}::timestamp, 1)
    ON CONFLICT ("scope", "key", "windowStart")
    DO UPDATE SET "count" = "RateLimitBucket"."count" + 1
    RETURNING "count"`;
  if (random() < SWEEP_PROBABILITY) await sweepStaleBuckets(now);
  return decide(count, windowStart, now, policy);
}

/**
 * Gives back one hit counted in the current window (e.g. the attempt turned out to be a
 * successful login, which the policy does not count). Never below zero.
 */
export async function refundRateLimit(
  scope: RateLimitScope,
  key: string,
  policy: RateLimitPolicy,
  { now = new Date() }: Pick<Options, "now"> = {},
): Promise<void> {
  const windowStart = windowStartFor(now, policy);
  const db = await database();
  await db.$executeRaw`
    UPDATE "RateLimitBucket" SET "count" = GREATEST("count" - 1, 0)
    WHERE "scope" = ${scope} AND "key" = ${key} AND "windowStart" = ${windowStart}::timestamp`;
}

/** Deletes buckets whose window is long over. Returns how many rows went. */
export async function sweepStaleBuckets(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - STALE_AFTER_MS);
  const db = await database();
  return db.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "windowStart" < ${cutoff}::timestamp`;
}
