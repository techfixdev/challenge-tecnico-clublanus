import { currencyName, currencySymbol } from "./currency";

/**
 * Money formatting for GranaBank: the one place that turns an amount into text.
 *
 * Decision: the Argentine format for both currencies, "$ 312.400,50" (pesos) and
 * "US$ 978,85" (dollars): a dot groups thousands and a comma marks the decimals, as
 * Argentine banks show both. It deviates from the Figma's "978.85" on purpose: with pesos
 * and dollars side by side, one format and distinct symbols keep "$" from being read as
 * dollars. Whole amounts drop the ",00", as the design's list does ("$125").
 *
 * The text is built from exact cents (never `Intl` over a float), so the server and every
 * browser render the same characters, whatever ICU data they ship.
 */

/** Anything we can turn into cents: numbers, decimal strings, or a Prisma `Decimal`. */
export type MoneyInput = number | string | { toFixed(digits: number): string };

/** Keeps the symbol and the number on one line. */
const NO_BREAK_SPACE = " ";
const DECIMAL = /^(-)?(\d+)(?:\.(\d+))?$/;

function decimalText(value: MoneyInput): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    // The shortest round-trip form ("10.1"), or fixed decimals for exponent notation.
    const text = String(value);
    return text.includes("e") ? value.toFixed(2) : text;
  }
  return value.toFixed(2);
}

/** Exact cents, rounded half away from zero at the third decimal. */
function toRoundedCents(value: MoneyInput): number {
  const match = DECIMAL.exec(decimalText(value));
  if (!match) throw new RangeError(`Invalid money amount: ${String(value)}`);
  const [, minus, units, fraction = ""] = match;
  const digits = fraction.padEnd(3, "0");
  const cents =
    Number(units) * 100 +
    Number(digits.slice(0, 2)) +
    (Number(digits[2]) >= 5 ? 1 : 0);
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Amount out of exact range: ${String(value)}`);
  }
  return minus ? -cents : cents;
}

function groupThousands(units: number): string {
  return String(units).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatCents(
  cents: number,
  fractionDigits: 0 | 2 | undefined,
): { negative: boolean; text: string } {
  const absolute = Math.abs(cents);
  const digits = fractionDigits ?? (absolute % 100 === 0 ? 0 : 2);
  const text =
    digits === 0
      ? groupThousands(
          Math.floor(absolute / 100) + (absolute % 100 >= 50 ? 1 : 0),
        )
      : `${groupThousands(Math.floor(absolute / 100))},${String(absolute % 100).padStart(2, "0")}`;
  // An amount that rounds to zero is just "0", never "-0".
  return { negative: cents < 0 && /[1-9]/.test(text), text };
}

/** "US$ 978,85", "$ 312.400,50", "US$ 125", "-US$ 95". */
export function formatMoney(value: MoneyInput, currency: string): string {
  const { negative, text } = formatCents(toRoundedCents(value), undefined);
  return `${negative ? "-" : ""}${currencySymbol(currency)}${NO_BREAK_SPACE}${text}`;
}

/**
 * The number alone, e.g. "978,85" (next to a currency chip, in the odometer).
 * `fractionDigits` forces the decimals, e.g. to keep an animated number's width stable.
 */
export function formatAmount(
  value: MoneyInput,
  options: { fractionDigits?: 0 | 2 } = {},
): string {
  const { negative, text } = formatCents(
    toRoundedCents(value),
    options.fractionDigits,
  );
  return `${negative ? "-" : ""}${text}`;
}

/**
 * How a screen reader should say an amount: "978,85 dólares", "1 peso", "menos 95
 * dólares". Symbols are read inconsistently ("U S dollar sign"), words never are.
 */
export function formatMoneyForSpeech(
  value: MoneyInput,
  currency: string,
): string {
  const cents = toRoundedCents(value);
  const { negative, text } = formatCents(cents, undefined);
  const name = currencyName(currency, Math.abs(cents) !== 100);
  return `${negative ? "menos " : ""}${text} ${name}`;
}

// U+2212 MINUS SIGN: typographically correct and read as "menos" by screen readers.
const MINUS = "\u2212";

export type MoneyDirection = "in" | "out";

/**
 * A movement's amount with its direction: "+US$ 95" in, "−$ 11.999" out, and the plain
 * amount when it is zero (nothing to sign). The amount itself is never negative.
 */
export function formatSignedMoney(
  value: MoneyInput,
  currency: string,
  direction: MoneyDirection,
): string {
  const money = formatMoney(value, currency);
  if (toRoundedCents(value) === 0) return money;
  return `${direction === "in" ? "+" : MINUS}${money}`;
}

/** `formatSignedMoney` for screen readers: "más 95 dólares", "menos 11.999 pesos". */
export function formatSignedMoneyForSpeech(
  value: MoneyInput,
  currency: string,
  direction: MoneyDirection,
): string {
  const spoken = formatMoneyForSpeech(value, currency);
  if (toRoundedCents(value) === 0) return spoken;
  return `${direction === "in" ? "más" : "menos"} ${spoken}`;
}
