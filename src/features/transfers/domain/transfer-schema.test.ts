import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildCvu } from "@/features/account/domain/account-identifiers";

import {
  MAX_TRANSFER_CENTS,
  TRANSFER_MESSAGES,
  parseRecipientQuery,
  parseTransferRequest,
} from "./transfer-schema";

const CVU = buildCvu("0000003", "1000000000017");
const KEY = randomUUID();

function errorsOf(input: unknown) {
  const result = parseTransferRequest(input);
  if (result.success) throw new Error("expected a validation failure");
  return result.details.fieldErrors;
}

describe("parseTransferRequest", () => {
  it("normalizes a valid request (alias lowercased, amount fixed, description trimmed)", () => {
    const result = parseTransferRequest({
      recipient: "  Hincha.Granate ",
      amount: "12,5",
      description: "  Entradas del sábado  ",
      idempotencyKey: KEY.toUpperCase(),
    });

    expect(result).toEqual({
      success: true,
      data: {
        recipient: { kind: "alias", alias: "hincha.granate" },
        amount: "12.50",
        amountCents: 1250,
        description: "Entradas del sábado",
        idempotencyKey: KEY,
      },
    });
  });

  it("recognizes a CVU, even grouped with spaces", () => {
    const grouped = CVU.replace(/(.{4})/g, "$1 ");
    const result = parseTransferRequest({
      recipient: grouped,
      amount: 10,
      cardId: "card_1",
      idempotencyKey: KEY,
    });

    expect(result.success && result.data).toMatchObject({
      recipient: { kind: "cvu", cvu: CVU },
      cardId: "card_1",
    });
  });

  it("treats a blank description as no description", () => {
    const result = parseTransferRequest({
      recipient: "hincha.granate",
      amount: "1",
      description: "   ",
      idempotencyKey: KEY,
    });

    expect(result.success && result.data.description).toBeUndefined();
  });

  it("explains each invalid field in Spanish", () => {
    expect(
      errorsOf({
        recipient: "",
        amount: "abc",
        description: "x".repeat(61),
        idempotencyKey: "not-a-uuid",
      }),
    ).toEqual({
      recipient: [TRANSFER_MESSAGES.recipientRequired],
      amount: [TRANSFER_MESSAGES.amountInvalid],
      description: [TRANSFER_MESSAGES.descriptionTooLong],
      idempotencyKey: [TRANSFER_MESSAGES.idempotencyKeyInvalid],
    });
  });

  it.each([
    ["0", TRANSFER_MESSAGES.amountPositive],
    ["0.00", TRANSFER_MESSAGES.amountPositive],
    ["10,555", TRANSFER_MESSAGES.amountInvalid],
    ["-5", TRANSFER_MESSAGES.amountInvalid],
    [(MAX_TRANSFER_CENTS + 1) / 100, TRANSFER_MESSAGES.amountTooLarge],
  ])("rejects the amount %j", (amount, message) => {
    expect(
      errorsOf({ recipient: "hincha.granate", amount, idempotencyKey: KEY })
        .amount,
    ).toEqual([message]);
  });

  it("accepts exactly the maximum amount", () => {
    const result = parseTransferRequest({
      recipient: "hincha.granate",
      amount: MAX_TRANSFER_CENTS / 100,
      idempotencyKey: KEY,
    });

    expect(result.success && result.data.amountCents).toBe(MAX_TRANSFER_CENTS);
  });

  it.each([
    ["1234", TRANSFER_MESSAGES.cvuLength],
    [
      `${CVU.slice(0, 21)}${(Number(CVU[21]) + 1) % 10}`,
      TRANSFER_MESSAGES.cvuInvalid,
    ],
    ["corto", TRANSFER_MESSAGES.aliasInvalid],
    ["con espacios en el medio", TRANSFER_MESSAGES.aliasInvalid],
  ])("rejects the recipient %j", (recipient, message) => {
    expect(
      errorsOf({ recipient, amount: "1", idempotencyKey: KEY }).recipient,
    ).toEqual([message]);
  });

  it("requires an idempotency key and rejects a non-object body", () => {
    expect(errorsOf({ recipient: "hincha.granate", amount: "1" })).toEqual({
      idempotencyKey: [TRANSFER_MESSAGES.idempotencyKeyInvalid],
    });

    const result = parseTransferRequest("hola");
    expect(result.success).toBe(false);
    expect(!result.success && result.details.formErrors).toEqual([
      TRANSFER_MESSAGES.bodyNotObject,
    ]);
  });
});

describe("parseRecipientQuery", () => {
  it("parses an alias or a CVU", () => {
    expect(parseRecipientQuery("Soy.Granate.Lanus")).toEqual({
      success: true,
      data: { kind: "alias", alias: "soy.granate.lanus" },
    });
    expect(parseRecipientQuery(CVU)).toEqual({
      success: true,
      data: { kind: "cvu", cvu: CVU },
    });
  });

  it("reports a missing or malformed query on the q field", () => {
    expect(parseRecipientQuery(null)).toEqual({
      success: false,
      details: {
        fieldErrors: { q: [TRANSFER_MESSAGES.recipientRequired] },
        formErrors: [],
      },
    });
    expect(parseRecipientQuery("x").success).toBe(false);
  });
});
