import { editAmount } from "./amount-editing";

/*
 * The send flow's numeric keypad, as a pure reducer over the amount text. Every key goes
 * through `editAmount`, the same live formatting the amount field applies to typing, so
 * the keypad, a hardware keyboard and a paste all write "12.500,50" the same way and
 * `parseAmount` (the form's and the server's parser) reads it as the same amount.
 */

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

/** A key of the keypad: a digit, the decimal comma, delete, or clear (long-press delete). */
export type KeypadKey = Digit | "decimal" | "delete" | "clear";

/** Cents: what an amount can carry after the comma. */
const MAX_DECIMALS = 2;

/**
 * Integer digits an amount can have (the database's `Decimal(12,2)`): past them
 * `parseAmount` refuses the text, so the keypad stops adding digits instead.
 */
const MAX_INTEGER_DIGITS = 10;

/** The text after a key, as if typed at the end of the field. */
function typeAtEnd(amount: string, text: string): string {
  const next = amount + text;
  return editAmount(amount, next, next.length).value;
}

function pressDigit(amount: string, digit: Digit): string {
  const comma = amount.indexOf(",");
  if (comma !== -1) {
    return amount.length - comma - 1 >= MAX_DECIMALS
      ? amount
      : typeAtEnd(amount, digit);
  }
  const integerDigits = amount.replace(/\D/g, "").length;
  return integerDigits >= MAX_INTEGER_DIGITS
    ? amount
    : typeAtEnd(amount, digit);
}

/** The amount text after pressing `key` (an ignored key returns it unchanged). */
export function pressKeypadKey(amount: string, key: KeypadKey): string {
  switch (key) {
    case "clear":
      return "";
    case "delete": {
      if (amount === "") return "";
      const next = amount.slice(0, -1);
      return editAmount(amount, next, next.length).value;
    }
    case "decimal":
      return amount.includes(",") ? amount : typeAtEnd(amount, ",");
    default:
      return pressDigit(amount, key);
  }
}

/**
 * The keypad key a hardware keyboard's key stands for (`KeyboardEvent.key`), or null:
 * digits, either decimal separator (the Spanish layout has a comma, the numpad a dot)
 * and Backspace.
 */
export function keypadKeyForKeyboard(key: string): KeypadKey | null {
  if (/^\d$/.test(key)) return key as Digit;
  if (key === "," || key === ".") return "decimal";
  if (key === "Backspace") return "delete";
  return null;
}
