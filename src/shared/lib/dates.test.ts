import { describe, expect, it } from "vitest";

import {
  formatLongDate,
  formatMonthName,
  formatTime,
  monthOf,
  monthRange,
} from "./dates";

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

describe("monthOf", () => {
  it("is the Buenos Aires calendar month of an instant", () => {
    expect(monthOf(new Date("2026-10-15T12:00:00Z"))).toBe("2026-10");
    // 02:30 UTC on Nov 1st is still Oct 31st, 23:30 in Buenos Aires.
    expect(monthOf(new Date("2026-11-01T02:30:00Z"))).toBe("2026-10");
    expect(monthOf(new Date("2026-11-01T03:00:00Z"))).toBe("2026-11");
  });
});

describe("monthRange", () => {
  it("spans from local midnight on the 1st to local midnight on the next 1st", () => {
    expect(monthRange("2026-10")).toEqual({
      from: new Date("2026-10-01T03:00:00.000Z"),
      to: new Date("2026-11-01T03:00:00.000Z"),
    });
  });

  it("rolls December over into January of the next year", () => {
    expect(monthRange("2026-12")).toEqual({
      from: new Date("2026-12-01T03:00:00.000Z"),
      to: new Date("2027-01-01T03:00:00.000Z"),
    });
  });
});

describe("formatMonthName", () => {
  it("is the capitalized Spanish month name", () => {
    expect(formatMonthName("2026-10")).toBe("Octubre");
    expect(formatMonthName("2027-01")).toBe("Enero");
  });
});
