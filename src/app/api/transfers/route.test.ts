// @vitest-environment node
import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TransferReceipt } from "@/features/transfers/domain/transfer";
import { TRANSFER_MESSAGES } from "@/features/transfers/domain/transfer-schema";
import {
  TRANSFER_SEND_POLICY,
  decide,
  windowStartFor,
} from "@/shared/lib/rate-limit";
import { databaseUnavailableError } from "@/test/db-errors";

/*
 * Exercises the real use case and zod schema; only the session, the Prisma repository and
 * Next's revalidation are mocked. The repository's SQL is covered by the integration tests.
 */
const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  execute: vi.fn(),
  revalidatePath: vi.fn(),
  consumeRateLimit: vi.fn(),
  refundRateLimit: vi.fn(),
}));

vi.mock("@/features/auth/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/features/transfers/data/prisma-transfer-repository", () => ({
  prismaTransferRepository: { execute: mocks.execute, findRecipient: vi.fn() },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
// The limiter's verdict logic is real; only its PostgreSQL counter lives in memory.
vi.mock("@/shared/server/rate-limit-store", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  refundRateLimit: mocks.refundRateLimit,
}));

const NOW = new Date("2026-10-08T12:03:00.000Z");
let hits: Map<string, number>;

const { POST } = await import("./route");

const RECEIPT: TransferReceipt = {
  id: "ctransfer1",
  amount: "30.50",
  currency: "USD",
  description: null,
  createdAt: new Date("2026-10-06T15:00:00.000Z"),
  recipient: { fullName: "Hincha Granate", alias: "hincha.granate" },
  sourceCard: {
    id: "card_mc",
    brand: "MASTERCARD",
    last4: "1234",
    balance: "948.35",
  },
  movementId: "cmovement1",
  reference: "ENV-7Q4K-92XA",
};

const BODY = {
  recipient: "hincha.granate",
  amount: "30.50",
  idempotencyKey: randomUUID(),
};

function post(
  body: unknown,
  headers: Record<string, string> = { "content-type": "application/json" },
) {
  return POST(
    new NextRequest("http://localhost:3000/api/transfers", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers,
    }),
  );
}

beforeEach(() => {
  mocks.getCurrentUser.mockReset().mockResolvedValue({ id: "user_1" });
  mocks.execute
    .mockReset()
    .mockResolvedValue({ ok: true, receipt: RECEIPT, replayed: false });
  mocks.revalidatePath.mockReset();
  hits = new Map();
  mocks.consumeRateLimit
    .mockReset()
    .mockImplementation(async (scope: string, key: string, policy) => {
      const count = (hits.get(`${scope}:${key}`) ?? 0) + 1;
      hits.set(`${scope}:${key}`, count);
      const windowStart = windowStartFor(NOW, policy);
      return { ...decide(count, windowStart, NOW, policy), windowStart };
    });
  mocks.refundRateLimit
    .mockReset()
    .mockImplementation(async (scope: string, key: string) => {
      const count = hits.get(`${scope}:${key}`) ?? 0;
      hits.set(`${scope}:${key}`, Math.max(0, count - 1));
    });
});

describe("POST /api/transfers rate limit", () => {
  it("answers the 11th send in 10 minutes with 429 and Retry-After, before any money moves", async () => {
    for (let send = 1; send <= 10; send++) {
      expect(
        (await post({ ...BODY, idempotencyKey: randomUUID() })).status,
      ).toBe(201);
    }
    mocks.execute.mockClear();

    const response = await post({ ...BODY, idempotencyKey: randomUUID() });

    expect(response.status).toBe(429);
    // Window 12:00–12:10, now 12:03 → 420 s.
    expect(response.headers.get("retry-after")).toBe("420");
    expect((await response.json()).error).toEqual({
      code: "RATE_LIMITED",
      message: "Demasiados intentos. Probá de nuevo en 7 minutos.",
    });
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.consumeRateLimit).toHaveBeenLastCalledWith(
      "transfer:send",
      "user_1",
      TRANSFER_SEND_POLICY,
    );
  });

  it("does not charge replays of the same key: a retried send never spends the budget twice", async () => {
    mocks.execute.mockResolvedValue({
      ok: true,
      receipt: RECEIPT,
      replayed: true,
    });

    for (let retry = 1; retry <= 15; retry++) {
      expect((await post(BODY)).status).toBe(200);
    }
    expect(mocks.refundRateLimit).toHaveBeenCalledWith(
      "transfer:send",
      "user_1",
      windowStartFor(NOW, TRANSFER_SEND_POLICY),
    );
  });

  it("counts sends per user: another user still gets through", async () => {
    for (let send = 1; send <= 11; send++) {
      await post({ ...BODY, idempotencyKey: randomUUID() });
    }
    mocks.getCurrentUser.mockResolvedValue({ id: "user_2" });

    expect((await post({ ...BODY, idempotencyKey: randomUUID() })).status).toBe(
      201,
    );
  });
});

describe("POST /api/transfers", () => {
  it("creates the transfer: 201 with the receipt and the new balance", async () => {
    const response = await post(BODY);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      data: {
        ...RECEIPT,
        createdAt: "2026-10-06T15:00:00.000Z",
        replayed: false,
      },
    });
    expect(mocks.execute).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        recipient: { kind: "alias", alias: "hincha.granate" },
        amountCents: 3050,
      }),
    );
    // Balances and movement lists change: nothing cached may serve the old ones.
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("answers 200 with the original receipt when the idempotency key is replayed", async () => {
    mocks.execute.mockResolvedValue({
      ok: true,
      receipt: RECEIPT,
      replayed: true,
    });

    const response = await post(BODY);

    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      id: RECEIPT.id,
      replayed: true,
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  // Machine input: only canonical amounts. "12.500" is never read as 12500 here.
  it.each(["10.555", "12.500", "1.234,56", "12,30", "1e3", " 10.55"])(
    "refuses the non-canonical amount %j: 400 and no money moves",
    async (amount) => {
      const response = await post({ ...BODY, amount });

      expect(response.status).toBe(400);
      const { error } = await response.json();
      expect(error.code).toBe("INVALID_INPUT");
      expect(error.details.fieldErrors).toEqual({
        amount: [TRANSFER_MESSAGES.amountInvalid],
      });
      expect(mocks.execute).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["10.55", 1055],
    [10.55, 1055],
    ["12500", 1250000],
    [12500, 1250000],
  ])("accepts the canonical amount %j", async (amount, amountCents) => {
    const response = await post({ ...BODY, amount });

    expect(response.status).toBe(201);
    expect(mocks.execute).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ amountCents }),
    );
  });

  it("answers 400 with every invalid field, in Spanish", async () => {
    const response = await post({ recipient: "x", amount: "0" });

    expect(response.status).toBe(400);
    const { error } = await response.json();
    expect(error.code).toBe("INVALID_INPUT");
    expect(error.details.fieldErrors).toEqual({
      recipient: [TRANSFER_MESSAGES.aliasInvalid],
      amount: [TRANSFER_MESSAGES.amountPositive],
      idempotencyKey: [TRANSFER_MESSAGES.idempotencyKeyInvalid],
    });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it.each([
    ["recipient_not_found", 404, "RECIPIENT_NOT_FOUND"],
    ["card_not_found", 404, "CARD_NOT_FOUND"],
    ["self_transfer", 422, "SELF_TRANSFER"],
    ["insufficient_funds", 422, "INSUFFICIENT_FUNDS"],
    ["currency_mismatch", 422, "CURRENCY_MISMATCH"],
    ["idempotency_conflict", 409, "IDEMPOTENCY_KEY_REUSED"],
  ])("maps %s to %i %s", async (reason, status, code) => {
    mocks.execute.mockResolvedValue({ ok: false, reason });

    const response = await post(BODY);

    expect(response.status).toBe(status);
    const { error } = await response.json();
    expect(error.code).toBe(code);
    expect(error.message).toEqual(expect.any(String));
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("answers 401 without a session, before reading the body", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await post("not json");

    expect(response.status).toBe(401);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("only accepts JSON from its own origin (CSRF)", async () => {
    const form = await post("recipient=x", {
      "content-type": "application/x-www-form-urlencoded",
    });
    const crossSite = await post(BODY, {
      "content-type": "application/json",
      origin: "https://evil.example",
    });
    const broken = await post("{", { "content-type": "application/json" });

    expect(form.status).toBe(415);
    expect(crossSite.status).toBe(403);
    expect(broken.status).toBe(400);
    expect((await broken.json()).error.code).toBe("INVALID_JSON");
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("answers 503 when the database is unreachable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.execute.mockRejectedValue(databaseUnavailableError());

    const response = await post(BODY);

    expect(response.status).toBe(503);
  });
});
