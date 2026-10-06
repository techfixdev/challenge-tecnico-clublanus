import { describe, expect, it, vi } from "vitest";

import {
  getMonthlySummary,
  parseSummaryMonth,
  type MovementTotalsRepository,
} from "./movement-summary";

type Totals = Awaited<ReturnType<MovementTotalsRepository["sumByType"]>>;

/** One currency (USD) unless `byCurrency` says otherwise. */
function repositoryReturning(
  totals: Totals,
  byCurrency: Record<string, Totals> = { USD: totals },
) {
  return {
    currenciesOf: vi.fn().mockResolvedValue(Object.keys(byCurrency)),
    sumByType: vi.fn(({ currency }: { currency: string }) =>
      Promise.resolve(byCurrency[currency] ?? {}),
    ),
  } satisfies MovementTotalsRepository;
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
      totals: [
        {
          currency: "USD",
          income: "1000.10",
          // 0.1 + 0.2 in floating point is 0.30000000000000004; cents are exact.
          expenses: "0.30",
        },
      ],
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

    expect(summary.totals[0]?.expenses).toBe("19999999999.98");
  });

  it("is zero, not missing, for a month without movements", async () => {
    const summary = await getMonthlySummary(repositoryReturning({}), "u", {
      now: OCTOBER_15,
    });

    expect(summary.totals).toEqual([
      { currency: "USD", income: "0.00", expenses: "0.00" },
    ]);
  });

  it("totals each currency on its own, in the account's order, never adding pesos to dollars", async () => {
    const repository = repositoryReturning(
      {},
      {
        USD: { RECEIVED: "95.00", SUBSCRIPTION: "125.00" },
        ARS: {
          RECEIVED: "185000.00",
          SENT: "45000.00",
          SUBSCRIPTION: "11999.00",
        },
      },
    );

    const summary = await getMonthlySummary(repository, "user_1", {
      now: OCTOBER_15,
    });

    expect(repository.currenciesOf).toHaveBeenCalledWith("user_1");
    expect(repository.sumByType).toHaveBeenCalledTimes(2);
    expect(repository.sumByType).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "ARS", status: "COMPLETED" }),
    );
    expect(summary.totals).toEqual([
      { currency: "USD", income: "95.00", expenses: "125.00" },
      { currency: "ARS", income: "185000.00", expenses: "56999.00" },
    ]);
  });

  it("falls back to dollars for an account with no card and no movement yet", async () => {
    const repository = repositoryReturning({}, {});

    const summary = await getMonthlySummary(repository, "u", {
      now: OCTOBER_15,
    });

    expect(summary.totals).toEqual([
      { currency: "USD", income: "0.00", expenses: "0.00" },
    ]);
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

  it.each(["2000-01", "2100-12"])("accepts the range boundary %j", (raw) => {
    expect(parseSummaryMonth(raw, OCTOBER_15)).toEqual({
      success: true,
      month: raw,
    });
  });

  it.each(["0000-01", "0099-12", "1999-12", "2101-01", "9999-12"])(
    "rejects the out-of-range month %j",
    (raw) => {
      expect(parseSummaryMonth(raw, OCTOBER_15)).toEqual({
        success: false,
        fieldErrors: { month: ["El mes debe estar entre 2000-01 y 2100-12"] },
      });
    },
  );
});
