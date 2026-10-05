import { describe, expect, it } from "vitest";

import { formatLongDate, formatTime } from "./dates";

describe("formatLongDate", () => {
  it("formats the full date in Spanish (Argentina)", () => {
    expect(formatLongDate(new Date("2026-09-12T15:00:00Z"))).toBe(
      "12 de septiembre de 2026",
    );
  });

  it("uses the Buenos Aires calendar day, not the UTC one", () => {
    // 01:30 UTC on the 5th is still the 4th in Buenos Aires (UTC-3).
    expect(formatLongDate(new Date("2026-10-05T01:30:00Z"))).toBe(
      "4 de octubre de 2026",
    );
  });
});

describe("formatTime", () => {
  it("formats a 24h time in Buenos Aires time", () => {
    expect(formatTime(new Date("2026-09-12T12:05:00Z"))).toBe("09:05");
    expect(formatTime(new Date("2026-10-04T21:00:00Z"))).toBe("18:00");
  });
});
