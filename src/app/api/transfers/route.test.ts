// @vitest-environment node
import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TransferReceipt } from "@/features/transfers/domain/transfer";
import { TRANSFER_MESSAGES } from "@/features/transfers/domain/transfer-schema";
import { databaseUnavailableError } from "@/test/db-errors";

/*
 * Exercises the real use case and zod schema; only the session, the Prisma repository and
 * Next's revalidation are mocked. The repository's SQL is covered by the integration tests.
 */
const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  execute: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/auth/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/features/transfers/data/prisma-transfer-repository", () => ({
  prismaTransferRepository: { execute: mocks.execute, findRecipient: vi.fn() },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

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
