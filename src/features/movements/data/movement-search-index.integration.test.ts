import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { db } from "@/shared/lib/db";

import { whereClause } from "./prisma-movement-repository";

/*
 * The movement search must be answerable from its trigram indexes, not only by reading
 * every row of the user. Postgres uses an expression index only when the query repeats the
 * exact indexed expression, so this explains the repository's own WHERE clause.
 *
 * On a handful of rows the planner rightly prefers the `userId` index, so the check runs
 * on a user with many movements, inside a transaction that is always rolled back (rows and
 * the refreshed statistics alike): the shared test database is left as it was.
 */

const BULK_ROWS = 20_000;
const SEARCH_INDEXES = [
  "Movement_counterparty_search_idx",
  "Movement_description_search_idx",
];

class Rollback extends Error {}

async function explainSearch(query: string): Promise<string> {
  let plan = "";
  const runId = randomUUID().slice(0, 8);
  try {
    await db.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email: `it-trgm-${runId}@granabank.test`,
            passwordHash: "not-a-real-hash",
            firstName: "Integration",
            lastName: "Trigram",
          },
        });
        await tx.$executeRaw`
          INSERT INTO "Movement" ("id", "userId", "counterparty", "description", "type",
                                  "amount", "reference", "occurredAt")
          SELECT ${runId} || '-' || g, ${user.id}, 'Comercio ' || g, 'Compra ' || md5(g::text),
                 'SENT', 1, ${`IT-TRGM-${runId}-`} || g, now() - g * interval '1 minute'
          FROM generate_series(1, ${BULK_ROWS}::int) AS g`;
        await tx.$executeRaw`ANALYZE "Movement"`;
        const rows = await tx.$queryRaw<{ "QUERY PLAN": string }[]>`
          EXPLAIN SELECT m."id" FROM "Movement" m
          WHERE ${whereClause(user.id, { query, type: undefined })}`;
        plan = rows.map((row) => row["QUERY PLAN"]).join("\n");
        throw new Rollback();
      },
      { timeout: 60_000 },
    );
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
  return plan;
}

describe("movement search index", () => {
  it("answers an accent-insensitive search from the trigram indexes", async () => {
    const plan = await explainSearch("matías");

    for (const index of SEARCH_INDEXES) expect(plan).toContain(index);
  }, 90_000);
});
