import { describe, expect, it } from "vitest";

import {
  buildCvu,
  maskCvu,
} from "@/features/account/domain/account-identifiers";

import { TRANSFER_FAILURE_MESSAGE } from "./transfer";
import {
  amountInputError,
  defaultSourceCardId,
  firstErrorMessage,
  normalizeAmountInput,
  pickRecentRecipients,
  recipientInputError,
  recipientInputHint,
  stepForFailure,
  stepForInvalidInput,
} from "./transfer-form";
import { transferLimitMessage } from "./transfer-rules";
import { TRANSFER_MESSAGES } from "./transfer-schema";

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

const USD_CARD = { balance: "978.85", currency: "USD" };
const ARS_CARD = { balance: "312400.50", currency: "ARS" };

describe("amountInputError", () => {
  it("accepts a decimal comma or dot within the available balance", () => {
    expect(amountInputError("12,30", USD_CARD)).toBeNull();
    expect(amountInputError("12.30", USD_CARD)).toBeNull();
    expect(amountInputError("978,85", USD_CARD)).toBeNull();
    expect(amountInputError("312.400,50", ARS_CARD)).toBeNull();
  });

  it("checks the chosen card's currency cap", () => {
    const rich = { balance: "200000000.00", currency: "ARS" };
    expect(amountInputError("150.000", { ...rich, currency: "USD" })).toBe(
      transferLimitMessage("USD"),
    );
    expect(amountInputError("150.000", rich)).toBeNull();
    expect(amountInputError("100.000.001", rich)).toBe(
      transferLimitMessage("ARS"),
    );
  });

  it.each([
    ["", TRANSFER_MESSAGES.amountInvalid],
    ["abc", TRANSFER_MESSAGES.amountInvalid],
    ["1,234", TRANSFER_MESSAGES.amountInvalid],
    ["0", TRANSFER_MESSAGES.amountPositive],
    ["100.000,01", transferLimitMessage("USD")],
    ["978,86", TRANSFER_FAILURE_MESSAGE.insufficient_funds],
  ])("rejects %j", (raw, message) => {
    expect(amountInputError(raw, USD_CARD)).toBe(message);
  });

  it("skips the balance check when no card is known", () => {
    expect(amountInputError("5000")).toBeNull();
  });
});

describe("defaultSourceCardId", () => {
  const usd = { id: "card_usd", currency: "USD" };
  const ars = { id: "card_ars", currency: "ARS" };

  it("starts from the peso account, wherever it sits in the list", () => {
    expect(defaultSourceCardId([usd, ars])).toBe("card_ars");
    expect(defaultSourceCardId([ars, usd])).toBe("card_ars");
  });

  it("falls back to the first card without a peso one, and to nothing without cards", () => {
    expect(
      defaultSourceCardId([usd, { id: "card_eur", currency: "EUR" }]),
    ).toBe("card_usd");
    expect(defaultSourceCardId([])).toBe("");
  });
});

describe("normalizeAmountInput", () => {
  it.each([
    ["12,30", "12,30"],
    ["12,3", "12,30"],
    ["12.3", "12,30"],
    ["0,5", "0,50"],
    ["  7,05 ", "7,05"],
    ["1234,5", "1.234,50"],
    ["312400.5", "312.400,50"],
  ])(
    "writes %j in the Argentine format with two decimals: %j",
    (raw, shown) => {
      expect(normalizeAmountInput(raw)).toBe(shown);
    },
  );

  it.each([
    "12",
    "1.234",
    "312.400",
    "",
    "abc",
    "12,",
    "1,234",
    "12,345",
    "1.2.3",
  ])(
    "leaves %j as typed (a whole amount, grouped too, or one the field flags as invalid)",
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
    // The card decides the currency: choosing another one can fix it.
    expect(stepForFailure("currency_mismatch")).toBe("amount");
    expect(stepForFailure("amount_over_limit")).toBe("amount");
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

  it("offers up to six people by default: enough to drag through, still one strip", () => {
    const rows = Array.from({ length: 8 }, (_, index) => ({
      sender: self,
      recipient: { ...hincha, id: `user_${index}`, alias: `persona.${index}x` },
    }));

    expect(pickRecentRecipients(rows, me)).toHaveLength(6);
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
