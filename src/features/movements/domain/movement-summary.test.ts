import { describe, expect, it, vi } from "vitest";

import {
  getMonthlySummary,
  parseSummaryMonth,
  type MovementTotalsRepository,
} from "./movement-summary";

function repositoryReturning(
  totals: Awaited<ReturnType<MovementTotalsRepository["sumByType"]>>,
) {
  return { sumByType: vi.fn().mockResolvedValue(totals) };
}

const OCTOBER_15 = new Date("2026-10-15T15:00:00Z");

describe("getMonthlySummary", () => {
  it("asks for the user's completed movements within the Buenos Aires month", async () => {
    const repository = repositoryReturning({});

    await getMonthlySummary(repository, "user_1", { month: "2026-10" });

    expect(repository.sumByType).toHaveBeenCalledWith({
      userId: "user_1",
      status: "COMPLETED",
      currency: "USD",
      from: new Date("2026-10-01T03:00:00.000Z"),
      to: new Date("2026-11-01T03:00:00.000Z"),
    });
  });

  it("defaults to the current month in Buenos Aires, not in UTC", async () => {
    const repository = repositoryReturning({});
    // Nov 1st, 02:30 UTC is still Oct 31st in Buenos Aires.
    const now = new Date("2026-11-01T02:30:00Z");

    const summary = await getMonthlySummary(repository, "user_1", { now });

    expect(summary.month).toBe("2026-10");
    expect(repository.sumByType).toHaveBeenCalledWith(
      expect.objectContaining({ from: new Date("2026-10-01T03:00:00.000Z") }),
    );
  });

  it("counts received as income and sent plus subscriptions as expenses, to the cent", async () => {
    const repository = repositoryReturning({
      RECEIVED: "1000.10",
      SENT: "0.10",
      SUBSCRIPTION: "0.20",
    });

    const summary = await getMonthlySummary(repository, "user_1", {
      now: OCTOBER_15,
    });

    expect(summary).toEqual({
      month: "2026-10",
      currency: "USD",
      income: "1000.10",
      // 0.1 + 0.2 in floating point is 0.30000000000000004; cents are exact.
      expenses: "0.30",
    });
  });

  it("adds large amounts exactly", async () => {
    const repository = repositoryReturning({
      SENT: "9999999999.99",
      SUBSCRIPTION: "9999999999.99",
    });

    const summary = await getMonthlySummary(repository, "user_1", {
      now: OCTOBER_15,
    });

    expect(summary.expenses).toBe("19999999999.98");
  });

  it("is zero, not missing, for a month without movements", async () => {
    const summary = await getMonthlySummary(repositoryReturning({}), "u", {
      now: OCTOBER_15,
    });

    expect(summary).toMatchObject({ income: "0.00", expenses: "0.00" });
  });
});

describe("parseSummaryMonth", () => {
  it("accepts YYYY-MM and defaults to the current month when absent", () => {
    expect(parseSummaryMonth("2026-09", OCTOBER_15)).toEqual({
      success: true,
      month: "2026-09",
    });
    expect(parseSummaryMonth(null, OCTOBER_15)).toEqual({
      success: true,
      month: "2026-10",
    });
  });

  it.each(["2026-13", "2026-1", "26-10", "2026-10-01", "octubre", ""])(
    "rejects %j",
    (raw) => {
      expect(parseSummaryMonth(raw, OCTOBER_15)).toMatchObject({
        success: false,
        fieldErrors: { month: [expect.any(String)] },
      });
    },
  );
});
