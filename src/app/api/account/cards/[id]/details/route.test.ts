// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CARD_REVEAL_POLICY,
  decide,
  windowStartFor,
} from "@/shared/lib/rate-limit";
import { databaseUnavailableError } from "@/test/db-errors";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findDetailsById: vi.fn(),
  consumeRateLimit: vi.fn(),
  recordCardReveal: vi.fn(),
}));

vi.mock("@/features/auth/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/features/account/data/prisma-card-repository", () => ({
  prismaCardDetailsRepository: { findDetailsById: mocks.findDetailsById },
}));

// The limiter's verdict logic is real; only its PostgreSQL counter is replaced by one in
// memory (the counter itself has its own integration test).
vi.mock("@/shared/server/rate-limit-store", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));

vi.mock("@/features/account/data/prisma-card-reveal-log", () => ({
  recordCardReveal: mocks.recordCardReveal,
}));

const route = await import("./route");
const { POST } = route;

const NOW = new Date("2026-10-08T12:03:00.000Z");
let hits: Map<string, number>;

const PAN = "5412751234561234";

function call(id: string, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest(`http://localhost/api/account/cards/${id}/details`, {
      method: "POST",
      headers: { host: "localhost", ...headers },
    }),
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
  hits = new Map();
  mocks.consumeRateLimit
    .mockReset()
    .mockImplementation(async (scope: string, key: string, policy) => {
      const count = (hits.get(`${scope}:${key}`) ?? 0) + 1;
      hits.set(`${scope}:${key}`, count);
      return decide(count, windowStartFor(NOW, policy), NOW, policy);
    });
  mocks.recordCardReveal.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/account/cards/:id/details", () => {
  it("has no GET: a reveal spends budget and writes an audit row, so it is not a safe method", () => {
    // Next answers 405 Method Not Allowed for a method the route does not export.
    expect("GET" in route).toBe(false);
  });

  it("answers 403 to another site's page, without spending the budget or reading the card", async () => {
    const response = await call("card_mc", {
      origin: "https://evil.example",
    });

    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).error.code).toBe("FORBIDDEN");
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.findDetailsById).not.toHaveBeenCalled();
  });

  it("serves the app's own page (same Origin as Host)", async () => {
    const response = await call("card_mc", { origin: "http://localhost" });

    expect(response.status).toBe(200);
  });

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

  it("logs every successful reveal (user, card, client IP) for the audit trail", async () => {
    await call("card_mc", { "x-forwarded-for": "203.0.113.7, 10.0.0.1" });

    expect(mocks.recordCardReveal).toHaveBeenCalledWith({
      userId: "user_1",
      cardId: "card_mc",
      ip: "203.0.113.7",
    });
  });

  it("does not log a reveal that found no card", async () => {
    mocks.findDetailsById.mockResolvedValue(null);

    await call("card_of_someone_else");

    expect(mocks.recordCardReveal).not.toHaveBeenCalled();
  });

  it("answers the 11th reveal in 10 minutes with 429 and Retry-After, without reading the card", async () => {
    for (let reveal = 1; reveal <= 10; reveal++) {
      expect((await call("card_mc")).status).toBe(200);
    }
    mocks.findDetailsById.mockClear();
    mocks.recordCardReveal.mockClear();

    const response = await call("card_mc");

    expect(response.status).toBe(429);
    // Window 12:00–12:10, now 12:03 → 420 s.
    expect(response.headers.get("retry-after")).toBe("420");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Demasiados intentos. Probá de nuevo en 7 minutos.",
      },
    });
    expect(mocks.findDetailsById).not.toHaveBeenCalled();
    expect(mocks.recordCardReveal).not.toHaveBeenCalled();
    expect(mocks.consumeRateLimit).toHaveBeenLastCalledWith(
      "card:reveal",
      "user_1",
      CARD_REVEAL_POLICY,
    );
  });

  it("counts reveals per user: another user still gets through", async () => {
    for (let reveal = 1; reveal <= 11; reveal++) await call("card_mc");
    mocks.getCurrentUser.mockResolvedValue({ id: "user_2" });

    expect((await call("card_mc")).status).toBe(200);
  });
});
