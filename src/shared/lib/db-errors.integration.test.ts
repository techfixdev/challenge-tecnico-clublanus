import { PrismaPg } from "@prisma/adapter-pg";
import { describe, expect, it } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";

import { classifyDatabaseError } from "./db-errors";

/*
 * Classifies what Prisma + the pg adapter really throw, against the local PostgreSQL, so the
 * classifier rests on observed errors and not on guessed codes. Each case derives a broken
 * URL from DATABASE_URL (wrong password, missing database, closed port).
 */

function brokenUrl(change: (url: URL) => void): string {
  const url = new URL(process.env.DATABASE_URL ?? "");
  change(url);
  return url.toString();
}

async function errorFrom(
  connectionString: string,
  query: (client: PrismaClient) => Promise<unknown>,
): Promise<unknown> {
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    await query(client);
    throw new Error("Expected the query to fail");
  } catch (error) {
    return error;
  } finally {
    await client.$disconnect();
  }
}

const QUERIES = {
  "a model query": (client: PrismaClient) => client.user.findFirst(),
  "a raw query": (client: PrismaClient) => client.$queryRaw`SELECT 1`,
};

describe.each(Object.entries(QUERIES))(
  "classifyDatabaseError with real errors from %s",
  (_label, query) => {
    it("treats a wrong password as misconfiguration", async () => {
      const url = brokenUrl((u) => {
        u.password = "wrong-password";
      });

      const error = await errorFrom(url, query);

      expect(error).toMatchObject({
        meta: {
          driverAdapterError: {
            cause: { kind: "AuthenticationFailed", originalCode: "28P01" },
          },
        },
      });
      expect(classifyDatabaseError(error)).toBe("misconfigured");
    });

    it("treats a missing database as misconfiguration", async () => {
      const url = brokenUrl((u) => {
        u.pathname = "/granabank_does_not_exist";
      });

      expect(classifyDatabaseError(await errorFrom(url, query))).toBe(
        "misconfigured",
      );
    });

    it("treats a refused connection as unavailable", async () => {
      const url = brokenUrl((u) => {
        u.port = "1"; // nothing listens there
      });

      expect(classifyDatabaseError(await errorFrom(url, query))).toBe(
        "unavailable",
      );
    });
  },
);
