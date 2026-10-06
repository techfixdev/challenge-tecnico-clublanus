import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { buildCvu } from "@/features/account/domain/account-identifiers";

import {
  MAX_TRANSFER_CENTS,
  TRANSFER_LIMIT_CENTS,
  TRANSFER_MESSAGES,
  checkTransferAmount,
  checkTransferRecipient,
  transferLimitCents,
  transferLimitMessage,
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
  ["1.234,56", null],
  ["1.234", null],
  [MAX_TRANSFER_CENTS / 100, null],
  ["0", TRANSFER_MESSAGES.amountPositive],
  ["0.00", TRANSFER_MESSAGES.amountPositive],
  ["10,555", TRANSFER_MESSAGES.amountInvalid],
  ["1,234", TRANSFER_MESSAGES.amountInvalid],
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

describe("per-currency limits", () => {
  it("caps a transfer at US$ 100.000 and $ 100.000.000", () => {
    expect(TRANSFER_LIMIT_CENTS).toEqual({
      USD: 100_000_00,
      ARS: 100_000_000_00,
    });
    expect(MAX_TRANSFER_CENTS).toBe(TRANSFER_LIMIT_CENTS.ARS);
    expect(transferLimitMessage("USD")).toBe(
      "El monto máximo por transferencia es US$\u00a0100.000",
    );
    expect(transferLimitMessage("ARS")).toBe(
      "El monto máximo por transferencia es $\u00a0100.000.000",
    );
  });

  it("applies the card's currency cap when the currency is known", () => {
    expect(checkTransferAmount("100.000", "USD").ok).toBe(true);
    expect(checkTransferAmount("100.000,01", "USD")).toEqual({
      ok: false,
      message: transferLimitMessage("USD"),
    });
    expect(checkTransferAmount("100.000,01", "ARS").ok).toBe(true);
    expect(checkTransferAmount("100.000.000", "ARS").ok).toBe(true);
    expect(checkTransferAmount("100.000.000,01", "ARS")).toEqual({
      ok: false,
      message: transferLimitMessage("ARS"),
    });
  });

  it("uses the strictest cap for a currency it does not know", () => {
    expect(transferLimitCents("EUR")).toBe(TRANSFER_LIMIT_CENTS.USD);
  });

  it("checks only the highest cap without a currency (the server, before the card)", () => {
    expect(checkTransferAmount("100.000,01").ok).toBe(true);
  });
});
