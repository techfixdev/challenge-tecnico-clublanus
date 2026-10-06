import { z } from "zod";

import { monthOf, monthRange } from "@/shared/lib/dates";

import type { MovementStatus, MovementType } from "./movement";

/**
 * Monthly summary ("Octubre · Ingresos +$X · Egresos −$Y") for the movements screen.
 *
 * Rules:
 * - Income is RECEIVED; expenses are SENT plus SUBSCRIPTION (automatic debits).
 * - Only COMPLETED movements count: a pending one may still fail or be reversed, so it
 *   is not money that came in or went out yet (it still shows in the list, flagged).
 * - The month is the calendar month in Buenos Aires, whatever the server's zone.
 * - It ignores the list's search and type filter: it describes the month, not the
 *   current view.
 * - Money stays exact: the database sums the decimals and this module only adds them
 *   as integer cents, never as floating-point money.
 */

/** The account currency; amounts in another currency must not be added to these. */
export const SUMMARY_CURRENCY = "USD";

const COUNTED_STATUS: MovementStatus = "COMPLETED";
const INCOME_TYPES: readonly MovementType[] = ["RECEIVED"];
const EXPENSE_TYPES: readonly MovementType[] = ["SENT", "SUBSCRIPTION"];

export type MovementTotalsQuery = {
  userId: string;
  status: MovementStatus;
  currency: string;
  /** Inclusive start instant. */
  from: Date;
  /** Exclusive end instant. */
  to: Date;
};

/** Port: sums per movement type, as fixed 2-decimal strings (types with no rows are absent). */
export interface MovementTotalsRepository {
  sumByType(
    query: MovementTotalsQuery,
  ): Promise<Partial<Record<MovementType, string>>>;
}

export type MonthlySummary = {
  /** "2026-10". */
  month: string;
  currency: string;
  /** Fixed 2-decimal strings, e.g. "95.00". */
  income: string;
  expenses: string;
};

/**
 * "123.45" → 12345. Parsed from the digits, never via `parseFloat` × 100. Each type's
 * total fits `Decimal(12,2)` sums comfortably below 2^53 cents, so integer math is exact.
 */
function toCents(amount: string): number {
  const negative = amount.startsWith("-");
  const [units, fraction = ""] = amount.replace("-", "").split(".");
  const cents = Number(units) * 100 + Number(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

function fromCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Total out of exact range: ${cents} cents`);
  }
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${sign}${Math.floor(absolute / 100)}.${fraction}`;
}

function sumOf(
  totals: Partial<Record<MovementType, string>>,
  types: readonly MovementType[],
): string {
  return fromCents(
    types.reduce((sum, type) => sum + toCents(totals[type] ?? "0"), 0),
  );
}

export async function getMonthlySummary(
  repository: MovementTotalsRepository,
  userId: string,
  { month, now = new Date() }: { month?: string; now?: Date } = {},
): Promise<MonthlySummary> {
  const summaryMonth = month ?? monthOf(now);
  const totals = await repository.sumByType({
    userId,
    status: COUNTED_STATUS,
    currency: SUMMARY_CURRENCY,
    ...monthRange(summaryMonth),
  });
  return {
    month: summaryMonth,
    currency: SUMMARY_CURRENCY,
    income: sumOf(totals, INCOME_TYPES),
    expenses: sumOf(totals, EXPENSE_TYPES),
  };
}

/**
 * Supported years, a fixed window. Outside it the month is not a real query: years below
 * 100 would even hit `Date.UTC`'s 19xx mapping. Fixed (not relative to "now") so the API
 * contract and its tests are deterministic; a future month inside it is simply empty.
 */
const MIN_SUMMARY_YEAR = 2000;
const MAX_SUMMARY_YEAR = 2100;

const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: "El mes debe tener el formato AAAA-MM",
    abort: true, // a malformed month gets one error, not also the range one
  })
  .refine((month) => {
    const year = Number(month.slice(0, 4));
    return year >= MIN_SUMMARY_YEAR && year <= MAX_SUMMARY_YEAR;
  }, `El mes debe estar entre ${MIN_SUMMARY_YEAR}-01 y ${MAX_SUMMARY_YEAR}-12`);

export type SummaryMonthResult =
  | { success: true; month: string }
  | { success: false; fieldErrors: Record<string, string[]> };

/** `?month=YYYY-MM` of the REST API; absent means the current month in Buenos Aires. */
export function parseSummaryMonth(
  raw: string | null,
  now = new Date(),
): SummaryMonthResult {
  if (raw === null) return { success: true, month: monthOf(now) };
  const parsed = monthSchema.safeParse(raw);
  return parsed.success
    ? { success: true, month: parsed.data }
    : {
        success: false,
        fieldErrors: { month: parsed.error.issues.map((i) => i.message) },
      };
}
