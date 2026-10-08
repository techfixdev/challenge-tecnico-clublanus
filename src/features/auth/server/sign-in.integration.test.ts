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

afterAll(async () => {
  await db.rateLimitBucket.deleteMany({
    where: { key: { in: [EMAIL, CLIENT_IP] } },
  });
});

describe("signIn rate limiting (PostgreSQL)", () => {
  it("refuses the 6th failed attempt for an email within 15 minutes", async () => {
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
      where: { key: { in: [EMAIL, CLIENT_IP] } },
      select: { scope: true, count: true },
      orderBy: { scope: "asc" },
    });
    expect(buckets).toEqual([
      { scope: "login:email", count: 6 },
      { scope: "login:ip", count: 6 },
    ]);
  });
});
