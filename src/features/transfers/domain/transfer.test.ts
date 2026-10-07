import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  TRANSFER_FAILURE_MESSAGE,
  isSameTransferRequest,
  planTransfer,
  previewRecipient,
  sendTransfer,
  type RecipientAccount,
  type TransferRepository,
  type TransferState,
} from "./transfer";

const SENDER = "user_sender";
const RECIPIENT: RecipientAccount = {
  id: "user_recipient",
  firstName: "Hincha",
  lastName: "Granate",
  alias: "hincha.granate",
  cvu: "0000003100010000000176",
};

function state(overrides: Partial<TransferState> = {}): TransferState {
  return {
    senderId: SENDER,
    amountCents: 5000,
    recipient: {
      id: RECIPIENT.id,
      cards: [{ id: "card_dest", currency: "USD" }],
    },
    sourceCard: { id: "card_src", currency: "USD", balance: "50.00" },
    ...overrides,
  };
}

const DEST_USD = { id: "card_dest", currency: "USD" };
const DEST_ARS = { id: "card_dest_ars", currency: "ARS" };

describe("planTransfer", () => {
  it("allows a transfer that spends the whole balance", () => {
    expect(planTransfer(state())).toEqual({
      ok: true,
      destinationCard: DEST_USD,
    });
  });

  it("credits the recipient's first card in the source card's currency", () => {
    const recipient = { id: RECIPIENT.id, cards: [DEST_USD, DEST_ARS] };
    expect(
      planTransfer(
        state({
          recipient,
          sourceCard: { id: "card_src", currency: "ARS", balance: "1000.00" },
        }),
      ),
    ).toEqual({ ok: true, destinationCard: DEST_ARS });
    expect(planTransfer(state({ recipient }))).toEqual({
      ok: true,
      destinationCard: DEST_USD,
    });
  });

  it("applies the source currency's cap: US$ 100.000, $ 100.000.000", () => {
    const rich = (currency: string) => ({
      id: "card_src",
      currency,
      balance: "999999999.00",
    });
    const recipient = { id: RECIPIENT.id, cards: [DEST_USD, DEST_ARS] };
    expect(
      planTransfer(
        state({ recipient, sourceCard: rich("USD"), amountCents: 100_000_01 }),
      ),
    ).toEqual({ ok: false, reason: "amount_over_limit" });
    expect(
      planTransfer(
        state({ recipient, sourceCard: rich("ARS"), amountCents: 100_000_01 }),
      ),
    ).toEqual({ ok: true, destinationCard: DEST_ARS });
    expect(
      planTransfer(
        state({
          recipient,
          sourceCard: rich("ARS"),
          amountCents: 100_000_000_01,
        }),
      ),
    ).toEqual({ ok: false, reason: "amount_over_limit" });
  });

  it.each([
    ["recipient_not_found", { recipient: null }],
    [
      // A recipient with no card to credit cannot receive money.
      "recipient_not_found",
      { recipient: { id: RECIPIENT.id, cards: [] } },
    ],
    [
      "self_transfer",
      {
        recipient: {
          id: SENDER,
          cards: [{ id: "card_src", currency: "USD" }],
        },
      },
    ],
    ["card_not_found", { sourceCard: null }],
    [
      // The recipient has cards, none in the source card's currency (no FX).
      "currency_mismatch",
      { recipient: { id: RECIPIENT.id, cards: [DEST_ARS] } },
    ],
    ["insufficient_funds", { amountCents: 5001 }],
  ] as const)("rejects with %s", (reason, overrides) => {
    expect(planTransfer(state(overrides))).toEqual({ ok: false, reason });
  });

  it("checks the recipient before the sender's card (no balance leak to a typo)", () => {
    expect(
      planTransfer(state({ recipient: null, amountCents: 999_999 })),
    ).toEqual({ ok: false, reason: "recipient_not_found" });
  });
});

describe("isSameTransferRequest", () => {
  const stored = {
    recipientId: RECIPIENT.id,
    amount: "10.00",
    description: null,
    sourceCardId: "card_src",
  };

  it("matches the same request, with or without the default card", () => {
    const request = { recipientId: RECIPIENT.id, amount: "10.00" };
    expect(isSameTransferRequest(stored, request)).toBe(true);
    expect(
      isSameTransferRequest(stored, { ...request, cardId: "card_src" }),
    ).toBe(true);
  });

  it.each([
    { recipientId: "someone_else", amount: "10.00" },
    { recipientId: RECIPIENT.id, amount: "10.01" },
    { recipientId: RECIPIENT.id, amount: "10.00", description: "Otra cosa" },
    { recipientId: RECIPIENT.id, amount: "10.00", cardId: "card_other" },
  ])("does not match a different request: %o", (request) => {
    expect(isSameTransferRequest(stored, request)).toBe(false);
  });
});

function fakeRepository(
  overrides: Partial<TransferRepository> = {},
): TransferRepository {
  return {
    findRecipient: vi.fn(async () => RECIPIENT),
    execute: vi.fn(async () => ({
      ok: false as const,
      reason: "insufficient_funds" as const,
    })),
    ...overrides,
  };
}

describe("sendTransfer", () => {
  it("validates before touching the repository", async () => {
    const repository = fakeRepository();

    const result = await sendTransfer(repository, SENDER, { amount: "1" });

    expect(result).toMatchObject({ ok: false, reason: "invalid_input" });
    expect(repository.execute).not.toHaveBeenCalled();
  });

  it("hands the normalized request to the repository and returns its outcome", async () => {
    const repository = fakeRepository();
    const key = randomUUID();

    const result = await sendTransfer(repository, SENDER, {
      recipient: "Hincha.Granate",
      amount: "10",
      idempotencyKey: key,
    });

    expect(repository.execute).toHaveBeenCalledWith(SENDER, {
      recipient: { kind: "alias", alias: "hincha.granate" },
      amount: "10.00",
      amountCents: 1000,
      idempotencyKey: key,
    });
    expect(result).toEqual({ ok: false, reason: "insufficient_funds" });
  });
});

describe("previewRecipient", () => {
  it("shows who will receive the money, with a masked CVU", async () => {
    await expect(
      previewRecipient(fakeRepository(), SENDER, "hincha.granate"),
    ).resolves.toEqual({
      ok: true,
      recipient: {
        fullName: "Hincha Granate",
        alias: "hincha.granate",
        cvuMasked: "•• •••• •••• •••• •••• 0176",
      },
    });
  });

  it("reports an unknown recipient, the sender themself, or a malformed query", async () => {
    const empty = fakeRepository({ findRecipient: async () => null });
    const self = fakeRepository({
      findRecipient: async () => ({ ...RECIPIENT, id: SENDER }),
    });

    await expect(
      previewRecipient(empty, SENDER, "nadie.granate"),
    ).resolves.toEqual({ ok: false, reason: "recipient_not_found" });
    await expect(
      previewRecipient(self, SENDER, "hincha.granate"),
    ).resolves.toEqual({ ok: false, reason: "self_transfer" });
    await expect(previewRecipient(empty, SENDER, "")).resolves.toMatchObject({
      ok: false,
      reason: "invalid_input",
    });
  });
});

describe("TRANSFER_FAILURE_MESSAGE", () => {
  it("has Spanish copy for every business failure", () => {
    expect(TRANSFER_FAILURE_MESSAGE.insufficient_funds).toMatch(/saldo/);
    expect(Object.keys(TRANSFER_FAILURE_MESSAGE)).toHaveLength(7);
  });
});
