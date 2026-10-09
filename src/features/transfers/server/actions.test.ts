import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  TRANSFER_FAILURE_MESSAGE,
  type TransferReceipt,
} from "../domain/transfer";
import {
  INITIAL_SEND_TRANSFER_STATE,
  TRANSFER_FORM_MESSAGES,
} from "../domain/transfer-form";
import { TRANSFER_MESSAGES } from "../domain/transfer-schema";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  sendTransferAs: vi.fn(),
  findRecipient: vi.fn(),
  consumeRateLimit: vi.fn(),
}));

vi.mock("@/features/auth/server/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("./send-transfer", () => ({ sendTransferAs: mocks.sendTransferAs }));
vi.mock("../data/prisma-transfer-repository", () => ({
  prismaTransferRepository: {
    findRecipient: mocks.findRecipient,
    execute: vi.fn(),
  },
}));

vi.mock("@/shared/server/rate-limit-store", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));

const { lookupRecipient, submitTransfer } = await import("./actions");

const USER = { id: "user_sender", firstName: "Granate" };
const KEY = randomUUID();
const UUID = /^[0-9a-f-]{36}$/;

const RECEIPT: TransferReceipt = {
  id: "ctransfer1",
  amount: "12.30",
  currency: "USD",
  description: null,
  createdAt: new Date("2026-10-06T15:00:00.000Z"),
  recipient: { fullName: "Hincha Granate", alias: "hincha.granate" },
  sourceCard: {
    id: "card_mc",
    brand: "MASTERCARD",
    last4: "1234",
    balance: "966.55",
  },
  movementId: "cmovement1",
  reference: "ENV-7Q4K-92XA",
};

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const FIELDS = {
  recipient: "hincha.granate",
  amount: "12,30",
  description: "",
  cardId: "card_mc",
  idempotencyKey: KEY,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.getCurrentUser.mockResolvedValue(USER);
  mocks.consumeRateLimit.mockResolvedValue({
    allowed: true,
    remaining: 29,
    windowStart: new Date("2026-10-08T12:00:00.000Z"),
  });
});

describe("submitTransfer", () => {
  it("sends the form as the signed-in user and returns the receipt and a fresh key", async () => {
    mocks.sendTransferAs.mockResolvedValue({
      ok: true,
      receipt: RECEIPT,
      replayed: false,
    });

    const state = await submitTransfer(
      INITIAL_SEND_TRANSFER_STATE,
      formData(FIELDS),
    );

    // The typed "12,30" reaches the domain as the canonical amount.
    expect(mocks.sendTransferAs).toHaveBeenCalledWith(USER.id, {
      recipient: "hincha.granate",
      amount: "12.30",
      description: undefined,
      cardId: "card_mc",
      idempotencyKey: KEY,
    });
    expect(state).toEqual({
      status: "success",
      receipt: RECEIPT,
      nextIdempotencyKey: expect.stringMatching(UUID),
    });
    expect(state.status === "success" && state.nextIdempotencyKey).not.toBe(
      KEY,
    );
  });

  it.each([
    ["1.234,56", "1234.56"],
    ["312.400,50", "312400.50"],
    ["12.500", "12500.00"],
    ["1234.56", "1234.56"],
    ["abc", "abc"],
  ])(
    "reads the typed amount %j the Argentine way and sends %j on",
    async (typed, canonical) => {
      mocks.sendTransferAs.mockResolvedValue({
        ok: true,
        receipt: RECEIPT,
        replayed: false,
      });

      await submitTransfer(
        INITIAL_SEND_TRANSFER_STATE,
        formData({ ...FIELDS, amount: typed }),
      );

      expect(mocks.sendTransferAs).toHaveBeenCalledWith(
        USER.id,
        expect.objectContaining({ amount: canonical }),
      );
    },
  );

  it("shows a replayed transfer as the same success (the money moved once)", async () => {
    mocks.sendTransferAs.mockResolvedValue({
      ok: true,
      receipt: RECEIPT,
      replayed: true,
    });

    const state = await submitTransfer(
      INITIAL_SEND_TRANSFER_STATE,
      formData(FIELDS),
    );

    expect(state).toMatchObject({ status: "success", receipt: RECEIPT });
  });

  it.each([
    ["insufficient_funds", "amount"],
    ["recipient_not_found", "recipient"],
    ["self_transfer", "recipient"],
    ["card_not_found", "amount"],
  ] as const)(
    "explains %s in Spanish and points at the %s step",
    async (reason, step) => {
      mocks.sendTransferAs.mockResolvedValue({ ok: false, reason });

      await expect(
        submitTransfer(INITIAL_SEND_TRANSFER_STATE, formData(FIELDS)),
      ).resolves.toEqual({
        status: "error",
        message: TRANSFER_FAILURE_MESSAGE[reason],
        step,
      });
    },
  );

  it("hands out a new key when the old one belongs to another transfer", async () => {
    mocks.sendTransferAs.mockResolvedValue({
      ok: false,
      reason: "idempotency_conflict",
    });

    const state = await submitTransfer(
      INITIAL_SEND_TRANSFER_STATE,
      formData(FIELDS),
    );

    expect(state).toEqual({
      status: "error",
      message: TRANSFER_FAILURE_MESSAGE.idempotency_conflict,
      step: "review",
      nextIdempotencyKey: expect.stringMatching(UUID),
    });
  });

  it("reports the first invalid field", async () => {
    mocks.sendTransferAs.mockResolvedValue({
      ok: false,
      reason: "invalid_input",
      details: {
        fieldErrors: { amount: [TRANSFER_MESSAGES.amountPositive] },
        formErrors: [],
      },
    });

    await expect(
      submitTransfer(INITIAL_SEND_TRANSFER_STATE, formData(FIELDS)),
    ).resolves.toEqual({
      status: "error",
      message: TRANSFER_MESSAGES.amountPositive,
      step: "amount",
    });
  });

  it("keeps the key after an unexpected failure, so a retry cannot pay twice", async () => {
    mocks.sendTransferAs.mockRejectedValue(new Error("database down"));

    const state = await submitTransfer(
      INITIAL_SEND_TRANSFER_STATE,
      formData(FIELDS),
    );

    expect(state).toEqual({
      status: "error",
      message: TRANSFER_FORM_MESSAGES.unexpected,
      step: "review",
    });
  });

  it("refuses without a session and never runs the use case", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(
      submitTransfer(INITIAL_SEND_TRANSFER_STATE, formData(FIELDS)),
    ).resolves.toEqual({
      status: "error",
      message: TRANSFER_FORM_MESSAGES.sessionExpired,
      step: "review",
    });
    expect(mocks.sendTransferAs).not.toHaveBeenCalled();
  });

  it("asks to wait, on the review step and keeping the key, when the user sent too many", async () => {
    mocks.sendTransferAs.mockResolvedValue({
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: 420,
    });

    await expect(
      submitTransfer(INITIAL_SEND_TRANSFER_STATE, formData(FIELDS)),
    ).resolves.toEqual({
      status: "error",
      message: "Demasiados intentos. Probá de nuevo en 7 minutos.",
      step: "review",
    });
  });
});

describe("lookupRecipient", () => {
  const ACCOUNT = {
    id: "user_recipient",
    firstName: "Hincha",
    lastName: "Granate",
    alias: "hincha.granate",
    cvu: "0000003100010000000255",
  };

  it("confirms who receives the money, masking the CVU", async () => {
    mocks.findRecipient.mockResolvedValue(ACCOUNT);

    await expect(lookupRecipient("  Hincha.Granate ")).resolves.toEqual({
      ok: true,
      recipient: {
        fullName: "Hincha Granate",
        alias: "hincha.granate",
        cvuMasked: "•• •••• •••• •••• •••• 0255",
        query: "Hincha.Granate",
      },
    });
  });

  it.each([
    [null, TRANSFER_FAILURE_MESSAGE.recipient_not_found],
    [{ ...ACCOUNT, id: USER.id }, TRANSFER_FAILURE_MESSAGE.self_transfer],
  ])(
    "explains a recipient that cannot receive (%#)",
    async (account, message) => {
      mocks.findRecipient.mockResolvedValue(account);

      await expect(lookupRecipient("hincha.granate")).resolves.toEqual({
        ok: false,
        message,
      });
    },
  );

  it("validates the text before searching, whatever the client sent", async () => {
    await expect(lookupRecipient("x")).resolves.toEqual({
      ok: false,
      message: TRANSFER_MESSAGES.aliasInvalid,
    });
    await expect(lookupRecipient(42 as unknown as string)).resolves.toEqual({
      ok: false,
      message: TRANSFER_MESSAGES.recipientRequired,
    });
    expect(mocks.findRecipient).not.toHaveBeenCalled();
  });

  it("answers without a session or when the lookup fails", async () => {
    mocks.findRecipient.mockRejectedValue(new Error("database down"));
    await expect(lookupRecipient("hincha.granate")).resolves.toEqual({
      ok: false,
      message: TRANSFER_FORM_MESSAGES.lookupUnexpected,
    });

    mocks.getCurrentUser.mockResolvedValue(null);
    await expect(lookupRecipient("hincha.granate")).resolves.toEqual({
      ok: false,
      message: TRANSFER_FORM_MESSAGES.sessionExpired,
    });
  });

  it("asks to wait, without searching, when the user looked up too many accounts", async () => {
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 420,
      windowStart: new Date("2026-10-08T12:00:00.000Z"),
    });

    await expect(lookupRecipient("hincha.granate")).resolves.toEqual({
      ok: false,
      message: "Demasiados intentos. Probá de nuevo en 7 minutos.",
    });
    expect(mocks.findRecipient).not.toHaveBeenCalled();
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith(
      "transfer:recipient-lookup",
      USER.id,
      expect.objectContaining({ limit: 30 }),
    );
  });
});
