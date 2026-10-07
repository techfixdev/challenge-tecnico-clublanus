import { describe, expect, it } from "vitest";

import { parseAmount } from "@/shared/lib/money";

import {
  keypadKeyForKeyboard,
  pressKeypadKey,
  type KeypadKey,
} from "./amount-keypad";

/** The amount after pressing `keys` in order, from `start`. */
function press(keys: KeypadKey[], start = ""): string {
  return keys.reduce(pressKeypadKey, start);
}

describe("pressKeypadKey", () => {
  it("groups thousands the Argentine way while digits come in", () => {
    expect(press(["1", "2", "5", "0", "0"])).toBe("12.500");
    expect(press(["decimal", "5", "0"], "12.500")).toBe("12.500,50");
  });

  it("builds text that reads as the same amount the server parses", () => {
    const amount = press(["1", "2", "5", "0", "0", "decimal", "5"]);
    expect(amount).toBe("12.500,5");
    expect(parseAmount(amount)?.amount).toBe("12500.50");
  });

  it("takes at most two decimals and one decimal comma", () => {
    expect(press(["7"], "12,50")).toBe("12,50");
    expect(press(["decimal"], "12,5")).toBe("12,5");
  });

  it("starts a bare decimal at zero and drops leading zeros", () => {
    expect(press(["decimal"])).toBe("0,");
    expect(press(["0", "0"])).toBe("0");
    expect(press(["0", "5"])).toBe("5");
  });

  it("deletes the last character and regroups what is left", () => {
    expect(press(["delete"], "12.500,50")).toBe("12.500,5");
    expect(press(["delete", "delete"], "12.500,5")).toBe("12.500");
    expect(press(["delete"], "12.500")).toBe("1.250");
    expect(press(["delete", "delete"], "0,")).toBe("");
    expect(press(["delete"], "")).toBe("");
  });

  it("clears the whole amount at once (a long press on delete)", () => {
    expect(press(["clear"], "12.500,50")).toBe("");
  });

  it("stops at the integer digits an amount can have", () => {
    const max = press(["1", "0", "0", "0", "0", "0", "0", "0", "0", "0"]);
    expect(max).toBe("1.000.000.000");
    expect(press(["5"], max)).toBe(max);
    expect(press(["decimal", "5"], max)).toBe("1.000.000.000,5");
  });
});

describe("keypadKeyForKeyboard", () => {
  it("maps a hardware keyboard to the keypad", () => {
    expect(keypadKeyForKeyboard("7")).toBe("7");
    expect(keypadKeyForKeyboard(",")).toBe("decimal");
    expect(keypadKeyForKeyboard(".")).toBe("decimal");
    expect(keypadKeyForKeyboard("Backspace")).toBe("delete");
    expect(keypadKeyForKeyboard("a")).toBeNull();
    expect(keypadKeyForKeyboard("Enter")).toBeNull();
  });
});
