import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/shared/lib/db";

import { buildDemoPan, isLuhnValid } from "../domain/card-number";
import { prismaCardDetailsRepository as repository } from "./prisma-card-repository";

/*
 * The reveal lookup against PostgreSQL: scoped by owner, and the `pan` CHECK constraint.
 * Self-contained: creates its own users and cards and deletes them afterwards.
 */

const RUN_ID = randomUUID().slice(0, 8);
const PAN = buildDemoPan("VISA", "5678", RUN_ID);
let ownerId: string;
let otherUserId: string;
let cardId: string;

async function createUser(label: string): Promise<string> {
  const user = await db.user.create({
    data: {
      email: `it-cards-${label}-${RUN_ID}@granabank.test`,
      passwordHash: "not-a-real-hash",
      firstName: "Integration",
      lastName: label,
    },
  });
  return user.id;
}

function cardData(userId: string, pan: string | null, last4 = "5678") {
  return {
    userId,
    brand: "VISA" as const,
    last4,
    pan,
    holderName: "Integration",
    expMonth: 1,
    expYear: 2030,
    balance: "312400.50",
    currency: "ARS",
  };
}

beforeAll(async () => {
  ownerId = await createUser("owner");
  otherUserId = await createUser("other");
  cardId = (await db.card.create({ data: cardData(ownerId, PAN) })).id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: [ownerId, otherUserId] } } });
});

describe("prismaCardDetailsRepository", () => {
  it("returns the owner's card number and balance", async () => {
    const details = await repository.findDetailsById(ownerId, cardId);

    expect(details).toEqual({
      id: cardId,
      pan: PAN,
      balance: "312400.50",
      currency: "ARS",
    });
    expect(isLuhnValid(details!.pan!)).toBe(true);
  });

  it("returns null for another user's card", async () => {
    await expect(
      repository.findDetailsById(otherUserId, cardId),
    ).resolves.toBeNull();
  });

  it("rejects a number that does not end in the card's last4", async () => {
    await expect(
      db.card.create({ data: cardData(ownerId, PAN, "9999") }),
    ).rejects.toThrow();
  });

  it("rejects a number that is not 16 digits", async () => {
    await expect(
      db.card.create({ data: cardData(ownerId, "45000000000a5678") }),
    ).rejects.toThrow();
  });
});
