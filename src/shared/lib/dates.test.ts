import { describe, expect, it } from "vitest";

import {
  dayOf,
  formatDayLabel,
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

describe("dayOf", () => {
  it("is the Buenos Aires calendar day of an instant", () => {
    expect(dayOf(new Date("2026-10-05T12:00:00Z"))).toBe("2026-10-05");
    // 02:59 UTC on the 6th is still the 5th, 23:59 in Buenos Aires.
    expect(dayOf(new Date("2026-10-06T02:59:00Z"))).toBe("2026-10-05");
    expect(dayOf(new Date("2026-10-06T03:00:00Z"))).toBe("2026-10-06");
  });
});

describe("formatDayLabel", () => {
  it("names today and yesterday", () => {
    expect(formatDayLabel("2026-10-07", "2026-10-07")).toBe("Hoy");
    expect(formatDayLabel("2026-10-06", "2026-10-07")).toBe("Ayer");
  });

  it("writes older days of this year without the year", () => {
    expect(formatDayLabel("2026-10-05", "2026-10-07")).toBe("5 de octubre");
  });

  it("adds the year to days of another year", () => {
    expect(formatDayLabel("2025-12-31", "2026-10-07")).toBe(
      "31 de diciembre de 2025",
    );
  });

  it("knows yesterday across a month and a year boundary", () => {
    expect(formatDayLabel("2026-09-30", "2026-10-01")).toBe("Ayer");
    expect(formatDayLabel("2025-12-31", "2026-01-01")).toBe("Ayer");
  });
});
