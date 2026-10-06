import { describe, expect, it } from "vitest";

import {
  buildCvu,
  maskCvu,
} from "@/features/account/domain/account-identifiers";

import { TRANSFER_FAILURE_MESSAGE } from "./transfer";
import {
  amountInputError,
  firstErrorMessage,
  normalizeAmountInput,
  pickRecentRecipients,
  recipientInputError,
  recipientInputHint,
  stepForFailure,
  stepForInvalidInput,
} from "./transfer-form";
import { MAX_TRANSFER_CENTS, TRANSFER_MESSAGES } from "./transfer-schema";

const CVU = buildCvu("0000003", "1000000000025");

describe("recipientInputError", () => {
  it("accepts an alias or a CVU (grouped too)", () => {
    expect(recipientInputError("Hincha.Granate")).toBeNull();
    expect(recipientInputError(CVU.replace(/(.{4})/g, "$1 "))).toBeNull();
  });

  it.each([
    ["", TRANSFER_MESSAGES.recipientRequired],
    ["   ", TRANSFER_MESSAGES.recipientRequired],
    ["corto", TRANSFER_MESSAGES.aliasInvalid],
    ["12345", TRANSFER_MESSAGES.cvuLength],
    [
      `${CVU.slice(0, 21)}${(Number(CVU[21]) + 1) % 10}`,
      TRANSFER_MESSAGES.cvuInvalid,
    ],
  ])("explains what is wrong with %j", (raw, message) => {
    expect(recipientInputError(raw)).toBe(message);
  });
});

describe("recipientInputHint", () => {
  it("counts CVU digits while typing one, and stays generic otherwise", () => {
    expect(recipientInputHint("0000 0031")).toBe("CVU: 8 de 22 dígitos");
    expect(recipientInputHint("hincha")).toBe(
      "Alias de 6 a 20 caracteres o CVU de 22 dígitos",
    );
    expect(recipientInputHint("")).toBe(
      "Alias de 6 a 20 caracteres o CVU de 22 dígitos",
    );
  });
});

describe("amountInputError", () => {
  it("accepts a decimal comma or dot within the available balance", () => {
    expect(amountInputError("12,30", "978.85")).toBeNull();
    expect(amountInputError("12.30", "978.85")).toBeNull();
    expect(amountInputError("978.85", "978.85")).toBeNull();
  });

  it.each([
    ["", TRANSFER_MESSAGES.amountInvalid],
    ["abc", TRANSFER_MESSAGES.amountInvalid],
    ["1,234", TRANSFER_MESSAGES.amountInvalid],
    ["0", TRANSFER_MESSAGES.amountPositive],
    [String(MAX_TRANSFER_CENTS / 100 + 1), TRANSFER_MESSAGES.amountTooLarge],
    ["978.86", TRANSFER_FAILURE_MESSAGE.insufficient_funds],
  ])("rejects %j", (raw, message) => {
    expect(amountInputError(raw, "978.85")).toBe(message);
  });

  it("skips the balance check when no card is known", () => {
    expect(amountInputError("5000")).toBeNull();
  });
});

describe("normalizeAmountInput", () => {
  it.each([
    ["12,30", "12.30"],
    ["12,3", "12.30"],
    ["12.3", "12.30"],
    ["0,5", "0.50"],
    ["  7,05 ", "7.05"],
  ])("writes %j with a decimal point and two decimals: %j", (raw, shown) => {
    expect(normalizeAmountInput(raw)).toBe(shown);
  });

  it.each(["12", "", "abc", "12,", "1,234", "12,345", "1.2.3"])(
    "leaves %j as typed (a whole amount, or one the field flags as invalid)",
    (raw) => {
      expect(normalizeAmountInput(raw)).toBe(raw);
    },
  );
});

describe("stepForFailure", () => {
  it("sends the user back to the step that can fix the problem", () => {
    expect(stepForFailure("recipient_not_found")).toBe("recipient");
    expect(stepForFailure("self_transfer")).toBe("recipient");
    expect(stepForFailure("insufficient_funds")).toBe("amount");
    expect(stepForFailure("card_not_found")).toBe("amount");
    expect(stepForFailure("currency_mismatch")).toBe("recipient");
    expect(stepForFailure("idempotency_conflict")).toBe("review");
  });
});

describe("firstErrorMessage", () => {
  it("prefers a field error in form order, then a root error", () => {
    expect(
      firstErrorMessage({
        fieldErrors: { amount: ["Monto"], recipient: ["Destino"] },
        formErrors: ["Raíz"],
      }),
    ).toBe("Destino");
    expect(firstErrorMessage({ fieldErrors: {}, formErrors: ["Raíz"] })).toBe(
      "Raíz",
    );
    expect(firstErrorMessage({ fieldErrors: {}, formErrors: [] })).toBeNull();
  });
});

describe("stepForInvalidInput", () => {
  it("maps the first invalid field to its step", () => {
    const step = (field: string) =>
      stepForInvalidInput({ fieldErrors: { [field]: ["x"] }, formErrors: [] });
    expect(step("recipient")).toBe("recipient");
    expect(step("amount")).toBe("amount");
    expect(step("description")).toBe("amount");
    expect(step("idempotencyKey")).toBe("review");
    expect(stepForInvalidInput({ fieldErrors: {}, formErrors: ["x"] })).toBe(
      "review",
    );
  });
});

describe("pickRecentRecipients", () => {
  const me = "user_me";
  const hincha = {
    id: "user_hincha",
    firstName: "Hincha",
    lastName: "Granate",
    alias: "hincha.granate",
    cvu: CVU,
  };
  const other = {
    id: "user_other",
    firstName: "Otra",
    lastName: "Persona",
    alias: "otra.persona",
    cvu: null,
  };
  const self = { ...hincha, id: me, alias: "soy.granate.lanus" };

  it("lists the other party of each transfer once, newest first", () => {
    const rows = [
      { sender: self, recipient: hincha },
      { sender: other, recipient: self },
      { sender: self, recipient: hincha },
    ];

    expect(pickRecentRecipients(rows, me)).toEqual([
      {
        fullName: "Hincha Granate",
        alias: "hincha.granate",
        cvuMasked: maskCvu(CVU),
        query: "hincha.granate",
      },
      {
        fullName: "Otra Persona",
        alias: "otra.persona",
        cvuMasked: null,
        query: "otra.persona",
      },
    ]);
  });

  it("skips accounts without an alias and honors the limit", () => {
    const rows = [
      { sender: self, recipient: { ...other, alias: null } },
      { sender: self, recipient: hincha },
      { sender: self, recipient: { ...other, id: "x", alias: "tercero.x" } },
    ];

    expect(
      pickRecentRecipients(rows, me, 1).map((recipient) => recipient.query),
    ).toEqual(["hincha.granate"]);
  });
});
