import { Client } from "pg";

import {
  CARD_REVEAL_POLICY,
  windowStartFor,
} from "../../src/shared/lib/rate-limit";
import { testDatabaseUrl } from "../../scripts/test-database";

/*
 * The rate-limit counters (`RateLimitBucket`) as the e2e specs need them. The limits stay
 * on in the app under test (no env flag turns them off); instead every scenario starts
 * from empty counters, like a new visitor, so a full run (which logs in and reveals cards
 * many times as the same demo users) never trips them by accident.
 */

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

/** Empties every counter (failed logins per email/IP, reveals per user). */
export function resetRateLimits(): Promise<void> {
  return withClient(async (client) => {
    await client.query(`DELETE FROM "RateLimitBucket"`);
  });
}

/** Spends `email`'s whole reveal budget for the current window: the next reveal is a 429. */
export function exhaustRevealBudget(email: string): Promise<void> {
  const windowStart = windowStartFor(new Date(), CARD_REVEAL_POLICY);
  return withClient(async (client) => {
    // The column is a UTC `timestamp`: the instant is converted explicitly, whatever the
    // session's time zone.
    await client.query(
      `INSERT INTO "RateLimitBucket" ("scope", "key", "windowStart", "count")
       SELECT 'card:reveal', u.id, ($2::timestamptz AT TIME ZONE 'UTC'), $3
         FROM "User" u WHERE u.email = $1
       ON CONFLICT ("scope", "key", "windowStart") DO UPDATE SET "count" = EXCLUDED."count"`,
      [email, windowStart.toISOString(), CARD_REVEAL_POLICY.limit],
    );
  });
}
