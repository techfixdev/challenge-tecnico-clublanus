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

/** Up to 10 integer digits (the `Decimal(12,2)` range) and at most 2 decimals. */
const AMOUNT_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

/**
 * User or API input → exact amount, or `null` when it is not a plain non-negative decimal
 * with at most 2 decimals. Accepts a decimal comma ("12,30") as typed on a Spanish keyboard.
 * A JSON number is read through its shortest decimal form (`10.1` → "10.1"), so a value
 * that needs more than 2 decimals is rejected rather than silently rounded.
 */
export function parseAmount(
  input: string | number,
): { amount: string; cents: number } | null {
  const text =
    typeof input === "number" ? String(input) : input.trim().replace(",", ".");
  if (!AMOUNT_PATTERN.test(text)) return null;
  const cents = toCents(text);
  return { amount: fromCents(cents), cents };
}
