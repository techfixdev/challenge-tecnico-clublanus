// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RateLimitPolicy } from "@/shared/lib/rate-limit";

/*
 * The stale-bucket sweep that rides along with a counted hit: it must never hold up or
 * fail the request. The database is mocked (the SQL itself has an integration test).
 */
const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  executeRaw: vi.fn(),
}));

vi.mock("@/shared/lib/db", () => ({
  db: { $queryRaw: mocks.queryRaw, $executeRaw: mocks.executeRaw },
}));

const { consumeRateLimit } = await import("./rate-limit-store");

const POLICY: RateLimitPolicy = { limit: 10, windowMs: 10 * 60_000 };
const NOW = new Date("2026-10-08T12:03:00.000Z");

beforeEach(() => {
  mocks.queryRaw.mockReset().mockResolvedValue([{ count: 1 }]);
  mocks.executeRaw.mockReset().mockResolvedValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("consumeRateLimit's stale-bucket sweep", () => {
  it("is handed off instead of awaited: the hit's verdict does not wait for it", async () => {
    const deferred: Array<() => Promise<void>> = [];
    mocks.executeRaw.mockReturnValue(new Promise(() => {})); // never settles

    const hit = await consumeRateLimit("card:reveal", "user_1", POLICY, {
      now: NOW,
      random: () => 0,
      runAfterResponse: (task) => deferred.push(task),
    });

    expect(hit).toMatchObject({ allowed: true, remaining: 9 });
    expect(deferred).toHaveLength(1);
  });

  it("never fails: a sweep that throws is logged, and the counted hit stands", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.executeRaw.mockRejectedValue(new Error("database down"));
    const deferred: Array<() => Promise<void>> = [];

    const hit = await consumeRateLimit("card:reveal", "user_1", POLICY, {
      now: NOW,
      random: () => 0,
      runAfterResponse: (task) => deferred.push(task),
    });

    expect(hit.allowed).toBe(true);
    await expect(deferred[0]()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(
      "Sweeping stale rate-limit buckets failed",
      expect.any(Error),
    );
  });

  it("runs without a request scope too (scripts, tests): it still sweeps, in the background", async () => {
    const hit = await consumeRateLimit("card:reveal", "user_1", POLICY, {
      now: NOW,
      random: () => 0,
    });

    expect(hit.allowed).toBe(true);
    await vi.waitFor(() => expect(mocks.executeRaw).toHaveBeenCalledTimes(1));
  });

  it("skips the sweep on most hits", async () => {
    const runAfterResponse = vi.fn();

    await consumeRateLimit("card:reveal", "user_1", POLICY, {
      now: NOW,
      random: () => 0.5,
      runAfterResponse,
    });

    expect(runAfterResponse).not.toHaveBeenCalled();
    expect(mocks.executeRaw).not.toHaveBeenCalled();
  });
});
