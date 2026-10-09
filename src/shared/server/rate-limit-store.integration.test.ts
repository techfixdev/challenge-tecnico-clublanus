import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/shared/lib/db";
import type { RateLimitPolicy } from "@/shared/lib/rate-limit";

import {
  consumeRateLimit,
  refundRateLimit,
  sweepStaleBuckets,
} from "./rate-limit-store";

/*
 * The PostgreSQL counter behind the rate limits: atomic under concurrency, per key, per
 * window. Every test uses its own key (this run's id + a label) and the rows are deleted
 * afterwards, so nothing leaks into other suites.
 */

const RUN_ID = randomUUID().slice(0, 8);
const POLICY: RateLimitPolicy = { limit: 10, windowMs: 10 * 60_000 };
const NOW = new Date("2026-10-08T12:03:00.000Z");
const NEVER_SWEEP = { now: NOW, random: () => 1 };

function key(label: string) {
  return `it-${RUN_ID}-${label}`;
}

afterAll(async () => {
  await db.rateLimitBucket.deleteMany({
    where: { key: { startsWith: `it-${RUN_ID}-` } },
  });
});

describe("consumeRateLimit", () => {
  it("allows `limit` hits in a window and refuses the next one with the wait until it ends", async () => {
    const k = key("sequential");
    for (let hit = 1; hit <= 10; hit++) {
      const decision = await consumeRateLimit(
        "card:reveal",
        k,
        POLICY,
        NEVER_SWEEP,
      );
      expect(decision).toEqual({
        allowed: true,
        remaining: 10 - hit,
        windowStart: new Date("2026-10-08T12:00:00.000Z"),
      });
    }

    const eleventh = await consumeRateLimit(
      "card:reveal",
      k,
      POLICY,
      NEVER_SWEEP,
    );
    // Window 12:00–12:10, now 12:03 → 7 minutes left.
    expect(eleventh).toMatchObject({ allowed: false, retryAfterSeconds: 420 });
  });

  it("lets exactly `limit` of N concurrent hits through", async () => {
    const k = key("concurrent");
    const decisions = await Promise.all(
      Array.from({ length: 25 }, () =>
        consumeRateLimit("card:reveal", k, POLICY, NEVER_SWEEP),
      ),
    );

    expect(decisions.filter((d) => d.allowed)).toHaveLength(10);
    const bucket = await db.rateLimitBucket.findFirstOrThrow({
      where: { scope: "card:reveal", key: k },
    });
    expect(bucket.count).toBe(25);
  });

  it("keeps scopes and keys apart", async () => {
    const k = key("isolated");
    for (let hit = 0; hit < 10; hit++) {
      await consumeRateLimit("login:email", k, POLICY, NEVER_SWEEP);
    }

    expect(
      (await consumeRateLimit("login:ip", k, POLICY, NEVER_SWEEP)).allowed,
    ).toBe(true);
    expect(
      (await consumeRateLimit("login:email", key("other"), POLICY, NEVER_SWEEP))
        .allowed,
    ).toBe(true);
  });

  it.each(["transfer:recipient-lookup", "transfer:send"] as const)(
    "stores the %s scope (the column is VARCHAR(32))",
    async (scope) => {
      const k = key(scope);

      const hit = await consumeRateLimit(scope, k, POLICY, NEVER_SWEEP);

      expect(hit.allowed).toBe(true);
      expect(await db.rateLimitBucket.count({ where: { scope, key: k } })).toBe(
        1,
      );
    },
  );

  it("starts counting again in the next window, stored at the exact window start", async () => {
    const k = key("rollover");
    for (let hit = 0; hit < 11; hit++) {
      await consumeRateLimit("card:reveal", k, POLICY, NEVER_SWEEP);
    }

    const nextWindow = new Date("2026-10-08T12:10:00.000Z");
    const decision = await consumeRateLimit("card:reveal", k, POLICY, {
      now: nextWindow,
      random: () => 1,
    });

    expect(decision).toEqual({
      allowed: true,
      remaining: 9,
      windowStart: nextWindow,
    });
    // The raw SQL write and Prisma's read agree on the instant, whatever the process zone.
    const windows = await db.rateLimitBucket.findMany({
      where: { key: k },
      orderBy: { windowStart: "asc" },
      select: { windowStart: true, count: true },
    });
    expect(windows).toEqual([
      { windowStart: new Date("2026-10-08T12:00:00.000Z"), count: 11 },
      { windowStart: nextWindow, count: 1 },
    ]);
  });
});

describe("refundRateLimit", () => {
  it("gives one hit back, never going below zero", async () => {
    const k = key("refund");
    const hit = await consumeRateLimit("login:email", k, POLICY, NEVER_SWEEP);
    await refundRateLimit("login:email", k, hit.windowStart);
    await refundRateLimit("login:email", k, hit.windowStart);

    const bucket = await db.rateLimitBucket.findFirstOrThrow({
      where: { scope: "login:email", key: k },
    });
    expect(bucket.count).toBe(0);
  });

  it("refunds the window the hit was counted in, even once the next one has started", async () => {
    const k = key("refund-boundary");
    // Counted a moment before 12:10; the refund (after a slow password check) lands after.
    const hit = await consumeRateLimit("login:email", k, POLICY, {
      now: new Date("2026-10-08T12:09:59.900Z"),
      random: () => 1,
    });
    await consumeRateLimit("login:email", k, POLICY, {
      now: new Date("2026-10-08T12:10:00.100Z"),
      random: () => 1,
    });

    await refundRateLimit("login:email", k, hit.windowStart);

    const windows = await db.rateLimitBucket.findMany({
      where: { key: k },
      orderBy: { windowStart: "asc" },
      select: { windowStart: true, count: true },
    });
    expect(windows).toEqual([
      { windowStart: new Date("2026-10-08T12:00:00.000Z"), count: 0 },
      { windowStart: new Date("2026-10-08T12:10:00.000Z"), count: 1 },
    ]);
  });
});

describe("sweepStaleBuckets", () => {
  it("deletes windows that ended over a day ago and keeps recent ones", async () => {
    const old = key("stale");
    const recent = key("recent");
    await consumeRateLimit("card:reveal", old, POLICY, {
      now: new Date("2026-10-06T08:00:00.000Z"),
      random: () => 1,
    });
    await consumeRateLimit("card:reveal", recent, POLICY, NEVER_SWEEP);

    await sweepStaleBuckets(NOW);

    const left = await db.rateLimitBucket.findMany({
      where: { key: { in: [old, recent] } },
      select: { key: true },
    });
    expect(left).toEqual([{ key: recent }]);
  });

  it("runs after the response on a small share of hits, decided by the injected random source", async () => {
    const old = key("stale-swept-by-hit");
    await consumeRateLimit("card:reveal", old, POLICY, {
      now: new Date("2026-10-06T08:00:00.000Z"),
      random: () => 1,
    });

    const deferred: Array<() => Promise<void>> = [];
    await consumeRateLimit("card:reveal", key("sweeper"), POLICY, {
      now: NOW,
      random: () => 0,
      runAfterResponse: (task) => deferred.push(task),
    });
    expect(deferred).toHaveLength(1);
    await deferred[0]();

    expect(await db.rateLimitBucket.count({ where: { key: old } })).toBe(0);
  });
});
