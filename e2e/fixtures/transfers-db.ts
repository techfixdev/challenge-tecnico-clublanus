import { Client } from "pg";

import { testDatabaseUrl } from "../../scripts/test-database";
import { DEMO_USER, SECOND_USER } from "./session";

/**
 * Undoes the transfers an e2e test made between the two demo users, so the seed facts the
 * other specs assert (balances, movement counts) hold again whatever ran before. It is the
 * exact inverse of a transfer: both balances restored, both movements and the transfer
 * deleted, in one database transaction. Narrower and faster than re-running the seed,
 * which would recreate every movement (new ids) under other specs' feet.
 */
const DEMO_EMAILS = [DEMO_USER.email, SECOND_USER.email];

/** The same database the e2e web server uses (playwright.config.ts), never the dev one. */
async function connect(): Promise<Client> {
  const client = new Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  return client;
}

/** The balance of a user's primary card, e.g. "978.85". */
export async function primaryCardBalance(email: string): Promise<string> {
  const client = await connect();
  try {
    const { rows } = await client.query<{ balance: string }>(
      `SELECT c.balance::text AS balance
         FROM "Card" c JOIN "User" u ON u.id = c."userId"
        WHERE u.email = $1 AND c."isPrimary"`,
      [email],
    );
    if (rows.length !== 1) throw new Error(`No primary card for ${email}`);
    return rows[0].balance;
  } finally {
    await client.end();
  }
}

/** The balance of one of a user's cards, by its last 4 digits, e.g. "312400.50". */
export async function cardBalance(
  email: string,
  last4: string,
): Promise<string> {
  const client = await connect();
  try {
    const { rows } = await client.query<{ balance: string }>(
      `SELECT c.balance::text AS balance
         FROM "Card" c JOIN "User" u ON u.id = c."userId"
        WHERE u.email = $1 AND c.last4 = $2`,
      [email, last4],
    );
    if (rows.length !== 1) throw new Error(`No card ${last4} for ${email}`);
    return rows[0].balance;
  } finally {
    await client.end();
  }
}

export async function undoDemoTransfersSince(since: Date): Promise<number> {
  const client = await connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      id: string;
      amount: string;
      sourceCardId: string | null;
      destinationCardId: string | null;
    }>(
      `SELECT t.id, t.amount::text AS amount, t."sourceCardId", t."destinationCardId"
         FROM "Transfer" t
         JOIN "User" s ON s.id = t."senderId"
         JOIN "User" r ON r.id = t."recipientId"
        WHERE s.email = ANY($1) AND r.email = ANY($1) AND t."createdAt" >= $2
        FOR UPDATE OF t`,
      [DEMO_EMAILS, since],
    );
    for (const transfer of rows) {
      await client.query(
        `UPDATE "Card" SET balance = balance + $2 WHERE id = $1`,
        [transfer.sourceCardId, transfer.amount],
      );
      await client.query(
        `UPDATE "Card" SET balance = balance - $2 WHERE id = $1`,
        [transfer.destinationCardId, transfer.amount],
      );
      await client.query(`DELETE FROM "Movement" WHERE "transferId" = $1`, [
        transfer.id,
      ]);
      await client.query(`DELETE FROM "Transfer" WHERE id = $1`, [transfer.id]);
    }
    await client.query("COMMIT");
    return rows.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}
