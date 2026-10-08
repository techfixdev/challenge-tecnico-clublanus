import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/shared/lib/db";

import { buildDemoPan } from "../domain/card-number";
import { revealCardDetailsForUser } from "./reveal-card-details";

/*
 * The reveal service against PostgreSQL: the per-user budget, and one audit row per
 * successful reveal. Self-contained: its own user and card, deleted afterwards (the audit
 * rows cascade with them; the rate-limit bucket is deleted by key).
 */

const RUN_ID = randomUUID().slice(0, 8);
let userId: string;
let cardId: string;

beforeAll(async () => {
  const user = await db.user.create({
    data: {
      email: `it-reveal-${RUN_ID}@granabank.test`,
      passwordHash: "not-a-real-hash",
      firstName: "Integration",
      lastName: "Reveal",
    },
  });
  userId = user.id;
  const card = await db.card.create({
    data: {
      userId,
      brand: "VISA",
      last4: "5678",
      pan: buildDemoPan("VISA", "5678", RUN_ID),
      holderName: "Integration",
      expMonth: 1,
      expYear: 2030,
      balance: "10.00",
      currency: "ARS",
    },
  });
  cardId = card.id;
});

afterAll(async () => {
  await db.rateLimitBucket.deleteMany({ where: { key: userId } });
  await db.user.delete({ where: { id: userId } });
});

describe("revealCardDetailsForUser", () => {
  it("serves 10 reveals with an audit row each, then refuses the 11th without logging it", async () => {
    for (let reveal = 1; reveal <= 10; reveal++) {
      const result = await revealCardDetailsForUser(userId, cardId, {
        clientIp: "203.0.113.7",
      });
      expect(result.ok).toBe(true);
    }

    const eleventh = await revealCardDetailsForUser(userId, cardId, {
      clientIp: "203.0.113.7",
    });

    expect(eleventh).toEqual({
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: expect.any(Number),
    });
    const log = await db.cardDetailsReveal.findMany({ where: { userId } });
    expect(log).toHaveLength(10);
    expect(log[0]).toMatchObject({ userId, cardId, ip: "203.0.113.7" });
  });
});
