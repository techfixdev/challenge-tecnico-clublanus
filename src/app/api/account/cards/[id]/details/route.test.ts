// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { databaseUnavailableError } from "@/test/db-errors";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findDetailsById: vi.fn(),
}));

vi.mock("@/features/auth/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/features/account/data/prisma-card-repository", () => ({
  prismaCardDetailsRepository: { findDetailsById: mocks.findDetailsById },
}));

const { GET } = await import("./route");

const PAN = "5412751234561234";

function call(id: string) {
  return GET(
    new NextRequest(`http://localhost/api/account/cards/${id}/details`),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "a-test-secret-that-is-at-least-32-chars");
  mocks.getCurrentUser.mockReset().mockResolvedValue({ id: "user_1" });
  mocks.findDetailsById.mockReset().mockResolvedValue({
    id: "card_mc",
    pan: PAN,
    balance: "978.85",
    currency: "USD",
  });
});

describe("GET /api/account/cards/:id/details", () => {
  it("returns the owner's full number, a 3-digit CVV and the balance, never cached", async () => {
    const response = await call("card_mc");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.findDetailsById).toHaveBeenCalledWith("user_1", "card_mc");
    const body = await response.json();
    expect(body).toEqual({
      data: {
        id: "card_mc",
        number: PAN,
        cvv: expect.stringMatching(/^\d{3}$/),
        balance: "978.85",
        currency: "USD",
      },
    });
  });

  it("answers number null (balance and CVV still there) when the card has no stored number", async () => {
    mocks.findDetailsById.mockResolvedValue({
      id: "card_mc",
      pan: null,
      balance: "978.85",
      currency: "USD",
    });

    const response = await call("card_mc");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        id: "card_mc",
        number: null,
        cvv: expect.stringMatching(/^\d{3}$/),
        balance: "978.85",
        currency: "USD",
      },
    });
  });

  it("answers 401 without a session, without touching the card", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await call("card_mc");

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.findDetailsById).not.toHaveBeenCalled();
  });

  it("answers 404 for another user's card, exactly like an unknown one", async () => {
    mocks.findDetailsById.mockResolvedValue(null);

    const response = await call("card_of_someone_else");

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.error.code).toBe("CARD_NOT_FOUND");
    expect(JSON.stringify(body)).not.toContain(PAN);
  });

  it("answers 503 (no-store too) when the database is unreachable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findDetailsById.mockRejectedValue(databaseUnavailableError());

    const response = await call("card_mc");

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
