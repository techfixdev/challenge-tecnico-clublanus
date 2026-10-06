import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildCvu } from "@/features/account/domain/account-identifiers";

import {
  MAX_TRANSFER_CENTS,
  TRANSFER_MESSAGES,
  checkTransferAmount,
  checkTransferRecipient,
} from "./transfer-rules";
import { parseRecipientQuery, parseTransferRequest } from "./transfer-schema";

const CVU = buildCvu("0000003", "1000000000017");
const KEY = randomUUID();

const RECIPIENT_CASES: [string, string | null][] = [
  ["hincha.granate", null],
  ["  Soy.Granate.Lanus ", null],
  [CVU, null],
  [`${CVU.slice(0, 11)} ${CVU.slice(11)}`, null],
  ["", TRANSFER_MESSAGES.recipientRequired],
  ["   ", TRANSFER_MESSAGES.recipientRequired],
  ["1234", TRANSFER_MESSAGES.cvuLength],
  [
    `${CVU.slice(0, 21)}${(Number(CVU[21]) + 1) % 10}`,
    TRANSFER_MESSAGES.cvuInvalid,
  ],
  ["corto", TRANSFER_MESSAGES.aliasInvalid],
  ["con espacios en el medio", TRANSFER_MESSAGES.aliasInvalid],
  ["x".repeat(65), TRANSFER_MESSAGES.aliasInvalid],
];

const AMOUNT_CASES: [string | number, string | null][] = [
  ["1", null],
  ["12,30", null],
  [MAX_TRANSFER_CENTS / 100, null],
  ["0", TRANSFER_MESSAGES.amountPositive],
  ["0.00", TRANSFER_MESSAGES.amountPositive],
  ["10.555", TRANSFER_MESSAGES.amountInvalid],
  ["-5", TRANSFER_MESSAGES.amountInvalid],
  ["abc", TRANSFER_MESSAGES.amountInvalid],
  ["", TRANSFER_MESSAGES.amountInvalid],
  [(MAX_TRANSFER_CENTS + 1) / 100, TRANSFER_MESSAGES.amountTooLarge],
];

describe("checkTransferRecipient", () => {
  it("normalizes an alias or a CVU", () => {
    expect(checkTransferRecipient(" Soy.Granate.Lanus ")).toEqual({
      ok: true,
      key: { kind: "alias", alias: "soy.granate.lanus" },
    });
    expect(checkTransferRecipient(CVU)).toEqual({
      ok: true,
      key: { kind: "cvu", cvu: CVU },
    });
  });

  // The form checks with these rules and the server with its schema: same verdict.
  it.each(RECIPIENT_CASES)(
    "agrees with the server schema on %j",
    (raw, message) => {
      const result = checkTransferRecipient(raw);
      expect(result.ok ? null : result.message).toBe(message);

      const server = parseRecipientQuery(raw);
      expect(server.success ? null : server.details.fieldErrors.q?.[0]).toBe(
        message,
      );
    },
  );
});

describe("checkTransferAmount", () => {
  it("returns the normalized amount and its cents", () => {
    expect(checkTransferAmount("12,3")).toEqual({
      ok: true,
      amount: "12.30",
      cents: 1230,
    });
  });

  it.each(AMOUNT_CASES)(
    "agrees with the server schema on %j",
    (raw, message) => {
      const result = checkTransferAmount(raw);
      expect(result.ok ? null : result.message).toBe(message);

      const server = parseTransferRequest({
        recipient: "hincha.granate",
        amount: raw,
        idempotencyKey: KEY,
      });
      expect(
        server.success ? null : server.details.fieldErrors.amount?.[0],
      ).toBe(message);
    },
  );
});
