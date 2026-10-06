import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { MovementStatus, MovementType } from "@/generated/prisma/client";
import { db } from "@/shared/lib/db";

import { getMonthlySummary } from "../domain/movement-summary";
import { prismaMovementRepository as repository } from "./prisma-movement-repository";

/*
 * The monthly summary's SQL aggregation against PostgreSQL. Self-contained: the run
 * creates its own users and movements (fixed instants) and deletes them afterwards.
 */

const RUN_ID = randomUUID().slice(0, 8);
/** October 2026 in Buenos Aires: [Oct 1st 03:00 UTC, Nov 1st 03:00 UTC). */
const OCTOBER_START = new Date("2026-10-01T03:00:00.000Z");
const NOVEMBER_START = new Date("2026-11-01T03:00:00.000Z");
const ONE_MS = 1;

let ownerId: string;
let otherUserId: string;
let emptyUserId: string;
let sequence = 0;

async function createUser(label: string): Promise<string> {
  const user = await db.user.create({
    data: {
      email: `it-summary-${label}-${RUN_ID}@granabank.test`,
      passwordHash: "not-a-real-hash",
      firstName: "Integration",
      lastName: label,
    },
  });
  return user.id;
}

async function createMovement(
  userId: string,
  type: MovementType,
  amount: string,
  occurredAt: Date,
  options: { status?: MovementStatus; currency?: string } = {},
) {
  sequence += 1;
  await db.movement.create({
    data: {
      userId,
      counterparty: `Resumen ${sequence}`,
      description: "Pago de prueba",
      type,
      amount,
      status: options.status ?? "COMPLETED",
      currency: options.currency ?? "USD",
      reference: `IT-SUM-${RUN_ID}-${sequence}`,
      occurredAt,
    },
  });
}

beforeAll(async () => {
  ownerId = await createUser("owner");
  otherUserId = await createUser("other");
  emptyUserId = await createUser("empty");
  const midOctober = new Date("2026-10-15T15:00:00.000Z");

  // Counted: completed, in the month, in USD.
  await createMovement(ownerId, "RECEIVED", "100.10", OCTOBER_START); // first instant
  await createMovement(ownerId, "RECEIVED", "0.20", midOctober);
  await createMovement(ownerId, "SENT", "0.10", midOctober);
  await createMovement(ownerId, "SUBSCRIPTION", "0.20", midOctober);
  await createMovement(
    ownerId,
    "SUBSCRIPTION",
    "15.49",
    new Date(NOVEMBER_START.getTime() - ONE_MS), // Oct 31st, 23:59:59.999 in BA
  );

  // Not counted.
  await createMovement(ownerId, "SENT", "999.00", midOctober, {
    status: "PENDING",
  });
  await createMovement(ownerId, "RECEIVED", "500.00", midOctober, {
    currency: "ARS",
  });
  await createMovement(
    ownerId,
    "RECEIVED",
    "700.00",
    new Date(OCTOBER_START.getTime() - ONE_MS), // Sep 30th, 23:59:59.999 in BA (02:59 UTC Oct 1st)
  );
  await createMovement(ownerId, "SENT", "800.00", NOVEMBER_START);
  await createMovement(otherUserId, "RECEIVED", "50.00", midOctober);
});

afterAll(async () => {
  await db.user.deleteMany({
    where: { id: { in: [ownerId, otherUserId, emptyUserId] } },
  });
  await db.$disconnect();
});

describe("prismaMovementRepository.sumByType (PostgreSQL)", () => {
  it("sums completed movements per type within [from, to), scoped by user and currency", async () => {
    const totals = await repository.sumByType({
      userId: ownerId,
      status: "COMPLETED",
      currency: "USD",
      from: OCTOBER_START,
      to: NOVEMBER_START,
    });

    expect(totals).toEqual({
      RECEIVED: "100.30",
      SENT: "0.10",
      SUBSCRIPTION: "15.69",
    });
  });

  it("feeds the monthly summary with exact decimals", async () => {
    await expect(
      getMonthlySummary(repository, ownerId, { month: "2026-10" }),
    ).resolves.toEqual({
      month: "2026-10",
      currency: "USD",
      income: "100.30",
      expenses: "15.79",
    });
  });

  it("puts the movements on the Buenos Aires month edges where they belong", async () => {
    const september = await getMonthlySummary(repository, ownerId, {
      month: "2026-09",
    });
    const november = await getMonthlySummary(repository, ownerId, {
      month: "2026-11",
    });

    expect(september.income).toBe("700.00");
    expect(november.expenses).toBe("800.00");
  });

  it("is zero for a month without movements", async () => {
    await expect(
      getMonthlySummary(repository, emptyUserId, { month: "2026-10" }),
    ).resolves.toMatchObject({ income: "0.00", expenses: "0.00" });
  });
});
