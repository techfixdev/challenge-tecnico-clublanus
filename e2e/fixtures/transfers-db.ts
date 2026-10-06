import "dotenv/config";

import { Client } from "pg";

/**
 * Undoes the transfers an e2e test made between the two demo users, so the seed facts the
 * other specs assert (balances, movement counts) hold again whatever ran before. It is the
 * exact inverse of a transfer: both balances restored, both movements and the transfer
 * deleted, in one database transaction. Narrower and faster than re-running the seed,
 * which would recreate every movement (new ids) under other specs' feet.
 */
const DEMO_EMAILS = ["soygranate@clublanus.com", "hincha@clublanus.com"];

export async function undoDemoTransfersSince(since: Date): Promise<number> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();
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
