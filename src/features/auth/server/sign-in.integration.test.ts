import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/shared/lib/db";

import { signIn } from "./sign-in";

/*
 * The login service's rate limit against PostgreSQL, end to end: real user lookup, real
 * bcrypt, real counters. An email nobody registered (and a made-up client IP) keeps the
 * test self-contained; its counters are deleted afterwards. Only failed attempts run, so
 * no session cookie is ever set.
 */

const RUN_ID = randomUUID().slice(0, 8);
const EMAIL = `it-login-${RUN_ID}@granabank.test`;
const CLIENT_IP = `it-ip-${RUN_ID}`;
const ATTACKER_IP = `it-attacker-${RUN_ID}`;
const OWNER_IP = `it-owner-${RUN_ID}`;

afterAll(async () => {
  await db.rateLimitBucket.deleteMany({
    where: { key: { contains: RUN_ID } },
  });
});

function failWith(email: string, clientIp: string) {
  return signIn({ email, password: "wrong-password" }, { clientIp });
}

describe("signIn rate limiting (PostgreSQL)", () => {
  it("refuses a client's 6th failed attempt for an email within 15 minutes", async () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      expect(
        await signIn(
          { email: EMAIL, password: "wrong-password" },
          { clientIp: CLIENT_IP },
        ),
      ).toEqual({ ok: false, reason: "invalid_credentials" });
    }

    const sixth = await signIn(
      { email: EMAIL, password: "wrong-password" },
      { clientIp: CLIENT_IP },
    );

    expect(sixth).toEqual({
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: expect.any(Number),
    });
    const buckets = await db.rateLimitBucket.findMany({
      where: { key: { in: [EMAIL, `${EMAIL}|${CLIENT_IP}`, CLIENT_IP] } },
      select: { scope: true, count: true },
      orderBy: { scope: "asc" },
    });
    // The refused attempt stops at the email+client bucket: the email-wide one is spared.
    expect(buckets).toEqual([
      { scope: "login:email", count: 5 },
      { scope: "login:email-client", count: 6 },
      { scope: "login:ip", count: 6 },
    ]);
  });

  it("does not let failures from one IP lock the same email out for another IP", async () => {
    const email = `it-victim-${RUN_ID}@granabank.test`;
    for (let attempt = 1; attempt <= 5; attempt++) {
      await failWith(email, ATTACKER_IP);
    }
    expect(await failWith(email, ATTACKER_IP)).toMatchObject({
      reason: "rate_limited",
    });

    // The owner, from their own network, still gets their password checked.
    expect(await failWith(email, OWNER_IP)).toEqual({
      ok: false,
      reason: "invalid_credentials",
    });
  });
});
