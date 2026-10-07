// @vitest-environment node
import { describe, expect, it } from "vitest";

import { seedDate } from "./seed-date";

/**
 * `seedDate` works in the process's local time, so every instant here is built with the
 * local-time `Date` constructor too: the expectations hold whatever `TZ` the run uses.
 */
function localTime(day: number, hour: number, minute = 0, second = 0): Date {
  return new Date(2026, 9, day, hour, minute, second);
}

describe("seedDate", () => {
  const now = localTime(7, 8, 33);

  it("places a movement days ago at the given hour", () => {
    expect(seedDate(1, 18, now)).toEqual(localTime(6, 18));
    expect(seedDate(5, 9, now)).toEqual(localTime(2, 9));
  });

  it("keeps today's movement at its hour once that hour has passed", () => {
    expect(seedDate(0, 7, now)).toEqual(localTime(7, 7));
  });

  it("keeps a movement seeded for exactly now at now", () => {
    const onTheHour = localTime(7, 9);

    expect(seedDate(0, 9, onTheHour)).toEqual(onTheHour);
  });

  it("keeps the current hour's movement at the hour, minutes into it", () => {
    expect(seedDate(0, 9, localTime(7, 9, 59, 59))).toEqual(localTime(7, 9));
  });

  it("dates a movement seeded for later today at now, never in the future", () => {
    // Otherwise it would sit above every movement made after seeding (e.g. an e2e
    // transfer) in the newest-first lists, until that hour came.
    expect(seedDate(0, 9, now)).toEqual(now);
    for (let hour = 0; hour < 24; hour += 1) {
      for (const minute of [0, 30, 59]) {
        const at = localTime(7, hour, minute);
        expect(seedDate(0, 23, at).getTime()).toBeLessThanOrEqual(
          at.getTime(),
        );
      }
    }
  });

  it("returns a new date, never the caller's `now` itself", () => {
    const clamped = seedDate(0, 23, now);

    expect(clamped).toEqual(now);
    expect(clamped).not.toBe(now);
  });
});
