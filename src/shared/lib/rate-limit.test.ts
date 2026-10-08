import { describe, expect, it } from "vitest";

import {
  CARD_REVEAL_POLICY,
  combineDecisions,
  decide,
  LOGIN_EMAIL_POLICY,
  LOGIN_IP_POLICY,
  secondsUntilWindowEnds,
  tooManyAttemptsMessage,
  windowStartFor,
  type RateLimitPolicy,
} from "./rate-limit";

const FIVE_PER_15_MIN: RateLimitPolicy = { limit: 5, windowMs: 15 * 60_000 };

describe("policies", () => {
  it("limits failed logins to 5 per email and 20 per IP every 15 minutes, and reveals to 10 per user every 10 minutes", () => {
    expect(LOGIN_EMAIL_POLICY).toEqual({ limit: 5, windowMs: 900_000 });
    expect(LOGIN_IP_POLICY).toEqual({ limit: 20, windowMs: 900_000 });
    expect(CARD_REVEAL_POLICY).toEqual({ limit: 10, windowMs: 600_000 });
  });
});

describe("windowStartFor", () => {
  it("aligns the window to the epoch, so every instance agrees on it", () => {
    const now = new Date("2026-10-08T12:07:31.250Z");
    expect(windowStartFor(now, FIVE_PER_15_MIN)).toEqual(
      new Date("2026-10-08T12:00:00.000Z"),
    );
  });

  it("starts a new window exactly at the boundary", () => {
    const boundary = new Date("2026-10-08T12:15:00.000Z");
    expect(windowStartFor(boundary, FIVE_PER_15_MIN)).toEqual(boundary);
  });
});

describe("secondsUntilWindowEnds", () => {
  it("rounds up to whole seconds", () => {
    const start = new Date("2026-10-08T12:00:00.000Z");
    const now = new Date("2026-10-08T12:07:31.250Z");
    // 12:15:00 - 12:07:31.250 = 448.75 s
    expect(secondsUntilWindowEnds(start, now, FIVE_PER_15_MIN)).toBe(449);
  });

  it("is never below 1 second", () => {
    const start = new Date("2026-10-08T12:00:00.000Z");
    const now = new Date("2026-10-08T12:14:59.999Z");
    expect(secondsUntilWindowEnds(start, now, FIVE_PER_15_MIN)).toBe(1);
  });
});

describe("decide", () => {
  const start = new Date("2026-10-08T12:00:00.000Z");
  const now = new Date("2026-10-08T12:05:00.000Z");

  it("allows the first `limit` hits and says how many remain", () => {
    expect(decide(1, start, now, FIVE_PER_15_MIN)).toEqual({
      allowed: true,
      remaining: 4,
    });
    expect(decide(5, start, now, FIVE_PER_15_MIN)).toEqual({
      allowed: true,
      remaining: 0,
    });
  });

  it("refuses the hit after the limit until the window ends", () => {
    expect(decide(6, start, now, FIVE_PER_15_MIN)).toEqual({
      allowed: false,
      retryAfterSeconds: 600,
    });
    expect(decide(40, start, now, FIVE_PER_15_MIN)).toEqual({
      allowed: false,
      retryAfterSeconds: 600,
    });
  });
});

describe("combineDecisions", () => {
  it("is allowed only when every decision is, with the smallest remaining budget", () => {
    expect(
      combineDecisions([
        { allowed: true, remaining: 3 },
        { allowed: true, remaining: 12 },
      ]),
    ).toEqual({ allowed: true, remaining: 3 });
  });

  it("is refused when any decision is, waiting for the longest one", () => {
    expect(
      combineDecisions([
        { allowed: false, retryAfterSeconds: 60 },
        { allowed: true, remaining: 2 },
        { allowed: false, retryAfterSeconds: 300 },
      ]),
    ).toEqual({ allowed: false, retryAfterSeconds: 300 });
  });
});

describe("tooManyAttemptsMessage", () => {
  it("says the wait in whole minutes, rounded up", () => {
    expect(tooManyAttemptsMessage(449)).toBe(
      "Demasiados intentos. Probá de nuevo en 8 minutos.",
    );
  });

  it("uses the singular for one minute or less", () => {
    expect(tooManyAttemptsMessage(1)).toBe(
      "Demasiados intentos. Probá de nuevo en 1 minuto.",
    );
    expect(tooManyAttemptsMessage(60)).toBe(
      "Demasiados intentos. Probá de nuevo en 1 minuto.",
    );
  });
});
