import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { Client } from "pg";

import { testDatabaseUrl } from "../../scripts/test-database";
import { SECOND_USER, type Credentials } from "./session";

/*
 * A user that exists for one scenario only: no other spec knows its email, so nothing
 * running in a parallel worker (a login that resets a demo user's counters, a transfer)
 * can touch its data while the scenario runs. It gets copies of the second demo user's
 * cards and no alias or CVU, so it never shows up as a transfer recipient either.
 */

export type ThrowawayUser = Credentials & {
  /** Deletes the user; its cards, reveals and audit rows go with it (cascade). */
  remove: () => Promise<void>;
};

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

export async function createThrowawayUser(): Promise<ThrowawayUser> {
  const runId = randomUUID().slice(0, 8);
  const id = `e2e-throwaway-${runId}`;
  const email = `e2e-${runId}@granabank.test`;
  const password = `Granate-${runId}!`;
  const passwordHash = await bcrypt.hash(password, 10);

  await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query(
        `INSERT INTO "User" ("id", "email", "passwordHash", "firstName", "lastName")
         VALUES ($1, $2, $3, 'Prueba', 'Descartable')`,
        [id, email, passwordHash],
      );
      await client.query(
        `INSERT INTO "Card" ("id", "userId", "brand", "last4", "pan", "holderName",
                             "expMonth", "expYear", "balance", "currency", "isPrimary")
         SELECT $1 || '-card-' || c."id", $1, c."brand", c."last4", c."pan",
                'Prueba Descartable', c."expMonth", c."expYear", c."balance",
                c."currency", c."isPrimary"
           FROM "Card" c JOIN "User" u ON u."id" = c."userId"
          WHERE u."email" = $2`,
        [id, SECOND_USER.email],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });

  return {
    email,
    password,
    remove: () =>
      withClient(async (client) => {
        await client.query(
          `DELETE FROM "RateLimitBucket" WHERE "key" = $1 OR "key" LIKE $2 || '%'`,
          [id, email],
        );
        await client.query(`DELETE FROM "User" WHERE "id" = $1`, [id]);
      }),
  };
}
