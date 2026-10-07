import { describe, expect, it } from "vitest";

import { parseAmount } from "@/shared/lib/money";

import { editAmount } from "./amount-editing";

/**
 * One keystroke: `before` is the field with the caret marked by "|", `typed` is inserted
 * there (or "⌫" deletes the character before the caret). Returns the field afterwards,
 * caret marked the same way.
 */
function type(before: string, typed: string): string {
  const caret = before.indexOf("|");
  const value = before.replace("|", "");
  const next =
    typed === "⌫"
      ? value.slice(0, caret - 1) + value.slice(caret)
      : value.slice(0, caret) + typed + value.slice(caret);
  const nextCaret = typed === "⌫" ? caret - 1 : caret + typed.length;
  const edited = editAmount(value, next, nextCaret);
  return (
    edited.value.slice(0, edited.caret) + "|" + edited.value.slice(edited.caret)
  );
}

describe("editAmount", () => {
  it.each([
    ["|", "1", "1|"],
    ["1|", "2", "12|"],
    ["123|", "4", "1.234|"],
    ["1.234|", "5", "12.345|"],
    ["12.345|", "6", "123.456|"],
    ["123.456|", "7", "1.234.567|"],
  ])("groups thousands while typing: %j + %j → %j", (before, typed, after) => {
    expect(type(before, typed)).toBe(after);
  });

  it.each([
    ["12|", ",", "12,|"],
    ["1.234,|", "5", "1.234,5|"],
    ["1.234,5|", "0", "1.234,50|"],
    ["|", ",", "0,|"],
    ["1.234|", ".", "1.234,|"],
  ])(
    "takes a comma, or a dot after thousands, as the decimal comma: %j + %j → %j",
    (before, typed, after) => {
      expect(type(before, typed)).toBe(after);
    },
  );

  it.each([
    ["12|", ".", "12.|"],
    ["12.|", "4", "12.4|"],
    ["12.4|", "0", "12.40|"],
    ["12.40|", "0", "12.400|"],
    ["12.400|", ",", "12.400,|"],
    ["12.4|", "⌫", "12.|"],
    ["|", ".", "0.|"],
  ])(
    "keeps a dot typed after the digits open until the next digits decide it: %j + %j → %j",
    (before, typed, after) => {
      expect(type(before, typed)).toBe(after);
    },
  );

  it.each([
    ["12,5|", ",", "12,5|"],
    ["12,5|", ".", "12,5|"],
    ["1|.234", ".", "1|.234"],
  ])(
    "ignores a second decimal separator, or a dot with more than 2 digits after it: %j + %j → %j",
    (before, typed, after) => {
      expect(type(before, typed)).toBe(after);
    },
  );

  it.each([
    ["1.234|", "⌫", "123|"],
    ["12.345|", "⌫", "1.234|"],
    ["1.2|34", "⌫", "1|34"],
    ["1.|234", "⌫", "|234"],
    ["12,|5", "⌫", "12|5"],
    ["1.234,5|", "⌫", "1.234,|"],
  ])(
    "regroups after a deletion, never reading a grouping dot as a decimal: %j + %j → %j",
    (before, typed, after) => {
      expect(type(before, typed)).toBe(after);
    },
  );

  it.each([
    ["1|.234", "5", "15|.234"],
    ["|1.234", "9", "9|1.234"],
    ["12.3|45", "9", "123.9|45"],
  ])(
    "keeps the caret next to the digit just typed, mid-number too: %j + %j → %j",
    (before, typed, after) => {
      expect(type(before, typed)).toBe(after);
    },
  );

  it.each([
    ["|", "0", "0|"],
    ["0|", "0", "0|"],
    ["0|", "5", "5|"],
    ["0|", ",", "0,|"],
  ])(
    "never writes a leading zero before other digits: %j + %j → %j",
    (before, typed, after) => {
      expect(type(before, typed)).toBe(after);
    },
  );

  it.each([
    ["12,30", "12,30"],
    ["12.30", "12.30"],
    ["1.234,56", "1.234,56"],
    ["1234,56", "1.234,56"],
    ["1.234", "1.234"],
    ["312400.5", "312.400,5"],
    ["US$ 1.500", "1.500"],
  ])(
    "formats pasted text the way the parser reads it: %j → %j",
    (pasted, shown) => {
      const edited = editAmount("", pasted, pasted.length);
      expect(edited.value).toBe(shown);
      expect(edited.caret).toBe(shown.length);
      // Same amount as before formatting: the live format never changes what is sent.
      expect(parseAmount(shown)?.amount).toBe(
        parseAmount(pasted.replace("US$ ", ""))?.amount,
      );
    },
  );

  it("leaves what the field flags as invalid for the field to flag (too many decimals)", () => {
    expect(editAmount("12,34", "12,345", 6).value).toBe("12,345");
    expect(parseAmount("12,345")).toBeNull();
  });

  it("empties the field when every character is deleted", () => {
    expect(editAmount("1", "", 0)).toEqual({ value: "", caret: 0 });
  });
});
