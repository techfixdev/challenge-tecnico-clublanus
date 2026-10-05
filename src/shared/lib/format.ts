/**
 * Money formatting for GranaBank.
 *
 * Decision: the Figma design renders amounts as "$125" and "978.85", i.e. a dot as the
 * decimal separator and no decimals for whole amounts. Accounts are in USD, so we format
 * with the `en-US` locale (comma thousands, dot decimals) rather than `es-AR`, which would
 * render "978,85" and contradict the design. Whole amounts drop the ".00" to match the list.
 */

/** Anything we can turn into a number: plain numbers, decimal strings, or Prisma `Decimal`. */
export type MoneyInput = number | string | { toNumber(): number };

const LOCALE = "en-US";

function toNumber(value: MoneyInput): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    // `Number("")` and `Number("  ")` are 0, which would silently render "$0" for missing data.
    return value.trim() === "" ? Number.NaN : Number(value);
  }
  return value.toNumber();
}

function toFiniteNumber(value: MoneyInput): number {
  const amount = toNumber(value);
  if (!Number.isFinite(amount)) {
    throw new RangeError(`Invalid money amount: ${String(value)}`);
  }
  return amount;
}

function fractionDigits(amount: number): number {
  return Number.isInteger(amount) ? 0 : 2;
}

/** Formats an amount with its currency symbol, e.g. `$125`, `$978.85`, `-$95`. */
export function formatMoney(value: MoneyInput, currency = "USD"): string {
  const amount = toFiniteNumber(value);
  const digits = fractionDigits(amount);
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

/** Formats an amount without currency symbol, e.g. `978.85` (used next to a currency badge). */
export function formatAmount(value: MoneyInput): string {
  const amount = toFiniteNumber(value);
  const digits = fractionDigits(amount);
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}
