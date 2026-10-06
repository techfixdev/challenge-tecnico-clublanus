import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { MovementType } from "@/generated/prisma/client";
import { db } from "@/shared/lib/db";

import { decodeMovementCursor } from "../domain/movement-cursor";
import type { MovementFilters } from "../domain/movement-filters";
import { listMovements } from "../domain/movement-queries";
import { prismaMovementRepository as repository } from "./prisma-movement-repository";

/*
 * Runs the real SQL (unaccent search, LIKE escaping, keyset cursor) against PostgreSQL.
 * Each run creates every row it asserts on (its own users, with fixed timestamps) and
 * deletes them afterwards (rows cascade), so it neither needs nor touches the seed data.
 */

const RUN_ID = randomUUID().slice(0, 8);
const TIE_INSTANT = new Date("2026-03-10T12:00:00.000Z");
const BUENOS_AIRES = "America/Argentina/Buenos_Aires";
/** Not a multiple of the page size, and with ties, so every page boundary is exercised. */
const BULK_MOVEMENT_COUNT = 23;
const BULK_PAGE_SIZE = 7;

let ownerId: string;
let otherUserId: string;
let bulkUserId: string;
let sequence = 0;

async function createUser(label: string): Promise<string> {
  const user = await db.user.create({
    data: {
      email: `it-${label}-${RUN_ID}@granabank.test`,
      passwordHash: "not-a-real-hash",
      firstName: "Integration",
      lastName: label,
    },
  });
  return user.id;
}

async function createMovement(
  userId: string,
  data: { counterparty: string; type?: MovementType; occurredAt: Date },
) {
  sequence += 1;
  return db.movement.create({
    data: {
      userId,
      counterparty: data.counterparty,
      description: "Pago de prueba",
      type: data.type ?? "SENT",
      amount: "10.00",
      reference: `IT-${RUN_ID}-${sequence}`,
      occurredAt: data.occurredAt,
    },
  });
}

/** Rows for the full pagination walk: one every 6 hours, every fifth tied with the previous one. */
async function createBulkMovements(userId: string) {
  const base = Date.UTC(2026, 1, 1);
  const sixHours = 6 * 3_600_000;
  await db.movement.createMany({
    data: Array.from({ length: BULK_MOVEMENT_COUNT }, (_, index) => {
      const slot = index % 5 === 4 ? index - 1 : index;
      return {
        userId,
        counterparty: `Lote ${index}`,
        description: "Pago de prueba",
        type: "SENT" as const,
        amount: "1.00",
        reference: `IT-${RUN_ID}-bulk-${index}`,
        occurredAt: new Date(base - slot * sixHours),
      };
    }),
  });
}

function daysAgo(days: number): Date {
  return new Date(Date.UTC(2026, 2, 1) - days * 86_400_000);
}

async function search(userId: string, filters: MovementFilters) {
  const rows = await repository.findMany({ userId, filters, take: 100 });
  return rows.map((row) => row.counterparty);
}

/** Walks every page with the real cursor and returns the ids in order. */
async function collectAllPages(userId: string, pageSize: number) {
  const ids: string[] = [];
  let cursor: string | null = null;
  do {
    const page = await listMovements(repository, userId, {
      pageSize,
      cursor: cursor ? (decodeMovementCursor(cursor) ?? undefined) : undefined,
    });
    ids.push(...page.items.map((item) => item.id));
    cursor = page.nextCursor;
  } while (cursor);
  return ids;
}

beforeAll(async () => {
  ownerId = await createUser("owner");
  otherUserId = await createUser("other");
  bulkUserId = await createUser("bulk");
  await createBulkMovements(bulkUserId);

  await createMovement(ownerId, {
    counterparty: "José Suárez",
    type: "RECEIVED",
    occurredAt: daysAgo(1),
  });
  await createMovement(ownerId, {
    counterparty: "100% Café",
    occurredAt: daysAgo(2),
  });
  await createMovement(ownerId, {
    counterparty: "Plan_Familiar",
    type: "SUBSCRIPTION",
    occurredAt: daysAgo(3),
  });
  // One hour older than the previous row: a cursor shifted by a time zone offset in either
  // direction would repeat the cursor row or skip this one.
  await createMovement(ownerId, {
    counterparty: "Planeta Familiar",
    type: "SUBSCRIPTION",
    occurredAt: new Date(daysAgo(3).getTime() - 3_600_000),
  });
  // Two rows with the very same instant: only the id can order them.
  await createMovement(ownerId, {
    counterparty: "Empate A",
    occurredAt: TIE_INSTANT,
  });
  await createMovement(ownerId, {
    counterparty: "Empate B",
    occurredAt: TIE_INSTANT,
  });

  await createMovement(otherUserId, {
    counterparty: "José Ajeno",
    type: "RECEIVED",
    occurredAt: daysAgo(1),
  });
});

afterAll(async () => {
  await db.user.deleteMany({
    where: { id: { in: [ownerId, otherUserId, bulkUserId] } },
  });
  await db.$disconnect();
});

describe("prismaMovementRepository (PostgreSQL)", () => {
  // The cursor test below only proves something under a non-UTC zone; fail loudly if the
  // config stops applying it, instead of passing for the wrong reason.
  it("runs under the Buenos Aires time zone (vitest.integration.config.ts)", () => {
    expect(process.env.TZ).toBe(BUENOS_AIRES);
    // ICU may report the older alias, "America/Buenos_Aires".
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toMatch(
      /Buenos_Aires$/,
    );
    expect(new Date(TIE_INSTANT).getTimezoneOffset()).toBe(180);
  });

  describe("search", () => {
    it("ignores accents and case", async () => {
      expect(await search(ownerId, { query: "jose" })).toEqual(["José Suárez"]);
      expect(await search(ownerId, { query: "SUAREZ" })).toEqual([
        "José Suárez",
      ]);
      expect(await search(ownerId, { query: "café" })).toEqual(["100% Café"]);
    });

    it("also matches the description", async () => {
      expect(await search(ownerId, { query: "pago de prueba" })).toHaveLength(
        6,
      );
    });

    it("treats % and _ as literal characters, not wildcards", async () => {
      expect(await search(ownerId, { query: "%" })).toEqual(["100% Café"]);
      expect(await search(ownerId, { query: "plan_" })).toEqual([
        "Plan_Familiar",
      ]);
    });

    it("counts exactly what it lists", async () => {
      const filters = { query: "plan" };

      await expect(
        repository.count({ userId: ownerId, filters }),
      ).resolves.toBe(2);
    });
  });

  it("filters by type", async () => {
    expect(await search(ownerId, { type: "SUBSCRIPTION" })).toEqual([
      "Plan_Familiar",
      "Planeta Familiar",
    ]);
    expect(await search(ownerId, { type: "RECEIVED", query: "jose" })).toEqual([
      "José Suárez",
    ]);
  });

  describe("owner scope", () => {
    it("never returns another user's rows, even when they match", async () => {
      expect(await search(ownerId, { query: "jose" })).not.toContain(
        "José Ajeno",
      );
      expect(await search(otherUserId, {})).toEqual(["José Ajeno"]);
    });

    it("does not find another user's movement by id", async () => {
      const [foreign] = await repository.findMany({
        userId: otherUserId,
        filters: {},
        take: 1,
      });

      await expect(
        repository.findById(ownerId, foreign.id),
      ).resolves.toBeNull();
      await expect(
        repository.findById(otherUserId, foreign.id),
      ).resolves.toMatchObject({
        counterparty: "José Ajeno",
        amount: "10.00",
        card: null,
      });
    });
  });

  describe("keyset pagination", () => {
    it("orders rows with the same instant by id and pages through them without loss", async () => {
      const everything = await repository.findMany({
        userId: ownerId,
        filters: {},
        take: 100,
      });
      const tied = everything.filter(
        (row) => row.occurredAt.getTime() === TIE_INSTANT.getTime(),
      );

      expect(tied.map((row) => row.id)).toEqual(
        tied
          .map((row) => row.id)
          .sort()
          .reverse(),
      );
      // Page size 1 forces a cursor to sit between the two tied rows.
      expect(await collectAllPages(ownerId, 1)).toEqual(
        everything.map((row) => row.id),
      );
    });

    it("resumes strictly after the cursor row (the ::timestamp cast keeps the instant)", async () => {
      const filters = { type: "SUBSCRIPTION" } as const;
      const [first, second] = await repository.findMany({
        userId: ownerId,
        filters,
        take: 2,
      });

      const next = await repository.findMany({
        userId: ownerId,
        filters,
        after: { occurredAt: first.occurredAt, id: first.id },
        take: 2,
      });

      // Read back intact under a non-UTC process time zone...
      expect(first.occurredAt).toEqual(daysAgo(3));
      // ...and compared as the same instant in SQL: only the older row remains.
      expect(next.map((row) => row.id)).toEqual([second.id]);
    });

    it("walks every page with no duplicates or gaps", async () => {
      const paged = await collectAllPages(bulkUserId, BULK_PAGE_SIZE);
      const all = await repository.findMany({
        userId: bulkUserId,
        filters: {},
        take: 100,
      });

      expect(paged).toHaveLength(BULK_MOVEMENT_COUNT);
      expect(new Set(paged).size).toBe(BULK_MOVEMENT_COUNT);
      expect(paged).toEqual(all.map((row) => row.id));
    });
  });
});
