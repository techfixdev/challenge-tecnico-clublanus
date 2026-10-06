/**
 * Exact money arithmetic. Amounts travel as fixed 2-decimal strings (`Decimal(12,2)`
 * serialized) and are only ever combined as integer cents, never as floating-point money.
 */

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
/** A plain decimal with a dot ("12.30"), the API's and a JSON number's form. */
const DOT_DECIMAL = /^(\d+)\.(\d{1,2})$/;

/** The integer digits of an integer part written plain ("1234") or grouped ("1.234"). */
function integerDigits(text: string): string | null {
  if (PLAIN.test(text)) return text;
  if (GROUPED.test(text)) return text.replaceAll(".", "");
  return null;
}

/** Splits an amount as typed into integer digits and decimals, or null if malformed. */
function splitAmount(text: string): { units: string; fraction: string } | null {
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
 * User or API input → exact amount (canonical "1234.56" and its cents), or `null` when it
 * is not a non-negative amount with at most 2 decimals and 10 integer digits.
 *
 * Rules, shared by the send form and the server:
 * - A comma is the decimal separator, and there can only be one ("12,30", "1.234,56").
 * - Without a comma, dots before groups of exactly 3 digits are thousands separators
 *   ("1.234" = 1234, "312.400" = 312400) and a single dot before 1 or 2 digits is the
 *   decimal point ("12.30"), so the API's plain decimals keep working.
 * - Anything else is refused rather than guessed: "1,234" (en-US thousands or 3
 *   decimals?), "1.2345", "0.123", a sign, an exponent or spaces inside.
 * - A JSON number is read through its shortest decimal form (`10.1` → "10.1") and only
 *   as a plain decimal, never with thousands; a value that needs more than 2 decimals is
 *   rejected rather than silently rounded.
 */
export function parseAmount(
  input: string | number,
): { amount: string; cents: number } | null {
  const parts =
    typeof input === "number"
      ? splitPlainNumber(input)
      : splitAmount(input.trim());
  if (!parts || parts.units.length > MAX_INTEGER_DIGITS) return null;
  const cents =
    Number(parts.units) * 100 + Number(parts.fraction.padEnd(2, "0"));
  return { amount: fromCents(cents), cents };
}

function splitPlainNumber(
  input: number,
): { units: string; fraction: string } | null {
  const text = String(input);
  if (PLAIN.test(text)) return { units: text, fraction: "" };
  const decimal = DOT_DECIMAL.exec(text);
  return decimal ? { units: decimal[1], fraction: decimal[2] } : null;
}
