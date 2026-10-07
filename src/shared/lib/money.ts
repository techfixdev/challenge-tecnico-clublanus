/**
 * Exact money arithmetic. Amounts travel as fixed 2-decimal strings (`Decimal(12,2)`
 * serialized) and are only ever combined as integer cents, never as floating-point money.
 */

/** An amount split as written: its integer digits and its decimals ("" when none). */
type AmountParts = { units: string; fraction: string };

/** An exact amount: canonical text ("1234.56") and the same value in integer cents. */
type ExactAmount = { amount: string; cents: number };

/**
 * "123.45" → 12345. Parsed from the digits, never via `parseFloat` × 100. Any
 * `Decimal(12,2)` value (and sums of a few of them) stays far below 2^53 cents.
 */
export function toCents(amount: string): number {
  const negative = amount.startsWith("-");
  const [units, fraction = ""] = amount.replace("-", "").split(".");
  const cents = Number(units) * 100 + Number(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

/** 12345 → "123.45": the canonical 2-decimal string, the inverse of `toCents`. */
export function fromCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Amount out of exact range: ${cents} cents`);
  }
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${sign}${Math.floor(absolute / 100)}.${fraction}`;
}

/** Up to 10 integer digits: the `Decimal(12,2)` range. */
const MAX_INTEGER_DIGITS = 10;
/** "1.234", "312.400": a dot before every group of 3 digits, no leading zero. */
const GROUPED = /^[1-9]\d{0,2}(?:\.\d{3})+$/;
const PLAIN = /^\d+$/;
/** A plain decimal with a dot ("12.30"), a JSON number's form. */
const DOT_DECIMAL = /^(\d+)\.(\d{1,2})$/;

/** The integer digits of an integer part written plain ("1234") or grouped ("1.234"). */
function integerDigits(text: string): string | null {
  if (PLAIN.test(text)) return text;
  if (GROUPED.test(text)) return text.replaceAll(".", "");
  return null;
}

/** Splits an amount as typed into integer digits and decimals, or null if malformed. */
function splitAmount(text: string): AmountParts | null {
  if (text.includes(",")) {
    // One comma: the decimal separator; any dots before it group thousands.
    const [integer, fraction, ...rest] = text.split(",");
    if (rest.length > 0 || !/^\d{1,2}$/.test(fraction)) return null;
    const units = integerDigits(integer);
    return units === null ? null : { units, fraction };
  }
  // No comma: dots followed by 3 digits group thousands ("1.234" is 1234)…
  const units = integerDigits(text);
  if (units !== null) return { units, fraction: "" };
  // …and a single dot followed by 1 or 2 digits is the decimal point ("12.30").
  const decimal = DOT_DECIMAL.exec(text);
  return decimal ? { units: decimal[1], fraction: decimal[2] } : null;
}

/**
 * An amount as a person types it (the send form) → exact amount (canonical "1234.56" and
 * its cents), or `null` when it is not a non-negative amount with at most 2 decimals and
 * 10 integer digits. Human input only: machine input (the REST API, the domain) goes
 * through `parseCanonicalAmount`, where "12.500" is never 12500.
 *
 * Rules:
 * - A comma is the decimal separator, and there can only be one ("12,30", "1.234,56").
 * - Without a comma, dots before groups of exactly 3 digits are thousands separators
 *   ("1.234" = 1234, "312.400" = 312400) and a single dot before 1 or 2 digits is the
 *   decimal point ("12.30"), so a canonical amount reads the same.
 * - Anything else is refused rather than guessed: "1,234" (en-US thousands or 3
 *   decimals?), "1.2345", "0.123", a sign, an exponent or spaces inside.
 * - A JSON number is read through its shortest decimal form (`10.1` → "10.1") and only
 *   as a plain decimal, never with thousands; a value that needs more than 2 decimals is
 *   rejected rather than silently rounded.
 */
export function parseAmount(input: string | number): ExactAmount | null {
  const parts =
    typeof input === "number"
      ? splitPlainNumber(input)
      : splitAmount(input.trim());
  return exactAmount(parts);
}

/** Integer digits and decimals → canonical amount and cents, within `Decimal(12,2)`. */
function exactAmount(parts: AmountParts | null): ExactAmount | null {
  if (!parts || parts.units.length > MAX_INTEGER_DIGITS) return null;
  const cents =
    Number(parts.units) * 100 + Number(parts.fraction.padEnd(2, "0"));
  return { amount: fromCents(cents), cents };
}

/** A JSON number through its shortest decimal form: plain digits or one dot, no exponent. */
function splitPlainNumber(input: number): AmountParts | null {
  const text = String(input);
  if (PLAIN.test(text)) return { units: text, fraction: "" };
  const decimal = DOT_DECIMAL.exec(text);
  return decimal ? { units: decimal[1], fraction: decimal[2] } : null;
}

/** The canonical amount: plain digits, optionally a dot and 1 or 2 decimals. */
const CANONICAL = /^(\d{1,10})(?:\.(\d{1,2}))?$/;

/**
 * Machine input (a JSON number, or a string like "1234.56") → exact amount, or `null`.
 * A dot is always the decimal point and nothing else is accepted: no thousands
 * separators, no comma, no spaces, sign or exponent. "12.500" and "10.555" are refused
 * rather than read as 12500 / 10555, so an API client can never move 1000× what it meant.
 */
export function parseCanonicalAmount(
  input: string | number,
): ExactAmount | null {
  let parts: AmountParts | null;
  if (typeof input === "number") {
    parts = splitPlainNumber(input);
  } else {
    const match = CANONICAL.exec(input);
    parts = match ? { units: match[1], fraction: match[2] ?? "" } : null;
  }
  return exactAmount(parts);
}
