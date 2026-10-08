import { z } from "zod";

import { monthOf, monthRange } from "@/shared/lib/dates";
import { CURRENCIES } from "@/shared/lib/currency";
import { fromCents, toCents } from "@/shared/lib/money";

import type { MovementStatus, MovementType } from "./movement";

/**
 * Monthly summary ("Octubre · Ingresos +US$ X · Egresos −US$ Y", then the same in pesos)
 * for the movements screen.
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
 * - One total per currency, never a sum across them: there is no FX, so adding pesos
 *   to dollars would be meaningless. The currencies are the account's (its cards',
 *   primary first, then any other one with movements).
 */

/** What an account with no card and no movement yet shows: its default currency. */
const DEFAULT_SUMMARY_CURRENCY: string = CURRENCIES[0];

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
  /** The currencies the user's money is in: the cards' (primary first), then the rest. */
  currenciesOf(userId: string): Promise<string[]>;
  sumByType(
    query: MovementTotalsQuery,
  ): Promise<Partial<Record<MovementType, string>>>;
}

export type CurrencyTotals = {
  currency: string;
  /** Fixed 2-decimal strings, e.g. "95.00". */
  income: string;
  expenses: string;
};

export type MonthlySummary = {
  /** "2026-10". */
  month: string;
  /** One entry per currency, in the account's order; never empty. */
  totals: CurrencyTotals[];
};

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
  const range = monthRange(summaryMonth);
  const accountCurrencies = await repository.currenciesOf(userId);
  const currencies =
    accountCurrencies.length > 0
      ? accountCurrencies
      : [DEFAULT_SUMMARY_CURRENCY];
  const totals = await Promise.all(
    currencies.map(async (currency): Promise<CurrencyTotals> => {
      const byType = await repository.sumByType({
        userId,
        status: COUNTED_STATUS,
        currency,
        ...range,
      });
      return {
        currency,
        income: sumOf(byType, INCOME_TYPES),
        expenses: sumOf(byType, EXPENSE_TYPES),
      };
    }),
  );
  return { month: summaryMonth, totals };
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
        fieldErrors: {
          month: parsed.error.issues.map((issue) => issue.message),
        },
      };
}
