// @vitest-environment node
import { describe, expect, it } from "vitest";

import { seedDate } from "./seed-date";

describe("seedDate", () => {
  // vitest pins TZ=UTC, so local hours below are UTC hours.
  const now = new Date("2026-10-07T08:33:00.000Z");

  it("places a movement days ago at the given hour", () => {
    expect(seedDate(1, 18, now)).toEqual(new Date("2026-10-06T18:00:00.000Z"));
    expect(seedDate(5, 9, now)).toEqual(new Date("2026-10-02T09:00:00.000Z"));
  });

  it("keeps today's movement at its hour once that hour has passed", () => {
    expect(seedDate(0, 7, now)).toEqual(new Date("2026-10-07T07:00:00.000Z"));
  });

  it("never dates a movement after now, whatever the time of day", () => {
    // Seeding at 08:33 used to put today's 09:00 movement in the future, above any
    // movement made after seeding (e.g. an e2e transfer) in the newest-first lists.
    expect(seedDate(0, 9, now)).toEqual(now);
    for (let hour = 0; hour < 24; hour += 1) {
      for (const minute of [0, 30, 59]) {
        const at = new Date(Date.UTC(2026, 9, 7, hour, minute));
        expect(seedDate(0, 23, at).getTime()).toBeLessThanOrEqual(at.getTime());
      }
    }
  });
});
