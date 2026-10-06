// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { databaseUnavailableError } from "@/test/db-errors";
import { OWNER_ID } from "@/test/movement-fixtures";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  sumByType: vi.fn(),
  currenciesOf: vi.fn(),
}));

vi.mock("@/features/auth/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/features/movements/data/prisma-movement-repository", () => ({
  prismaMovementRepository: {
    sumByType: mocks.sumByType,
    currenciesOf: mocks.currenciesOf,
  },
}));

const { GET: summaryRoute } = await import("./route");

function get(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

beforeEach(() => {
  mocks.getCurrentUser.mockReset().mockResolvedValue({
    id: OWNER_ID,
    email: "soygranate@clublanus.com",
    firstName: "Granate",
    lastName: "Lanús",
  });
  mocks.currenciesOf.mockReset().mockResolvedValue(["USD"]);
  mocks.sumByType.mockReset().mockResolvedValue({
    RECEIVED: "95.00",
    SENT: "50.00",
    SUBSCRIPTION: "10.99",
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/movements/summary", () => {
  it("answers 401 without a session", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await summaryRoute(get("/api/movements/summary"));

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    expect(mocks.sumByType).not.toHaveBeenCalled();
  });

  it("summarizes the requested month for the signed-in user", async () => {
    const response = await summaryRoute(
      get("/api/movements/summary?month=2026-09"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        month: "2026-09",
        totals: [{ currency: "USD", income: "95.00", expenses: "60.99" }],
      },
    });
    expect(mocks.sumByType).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: OWNER_ID,
        from: new Date("2026-09-01T03:00:00.000Z"),
        to: new Date("2026-10-01T03:00:00.000Z"),
      }),
    );
  });

  it("defaults to the current month in Buenos Aires", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-01T02:30:00Z")); // Oct 31st in Buenos Aires

    const body = await (
      await summaryRoute(get("/api/movements/summary"))
    ).json();

    expect(body.data.month).toBe("2026-10");
  });

  it("answers 400 with a field error for a malformed month", async () => {
    const response = await summaryRoute(
      get("/api/movements/summary?month=2026-13"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(body.error.details.fieldErrors.month).toHaveLength(1);
  });

  it("answers 400 in Spanish for a month outside the supported range", async () => {
    const response = await summaryRoute(
      get("/api/movements/summary?month=0000-01"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(body.error.details.fieldErrors.month).toEqual([
      "El mes debe estar entre 2000-01 y 2100-12",
    ]);
    expect(mocks.sumByType).not.toHaveBeenCalled();
  });

  it("answers 503 when the database is down", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.sumByType.mockRejectedValue(databaseUnavailableError());

    const response = await summaryRoute(get("/api/movements/summary"));

    expect(response.status).toBe(503);
  });
});
