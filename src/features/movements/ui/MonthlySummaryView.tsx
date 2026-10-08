import { Fragment } from "react";

import { formatMonthName } from "@/shared/lib/dates";
import { Money } from "@/shared/ui/Money";
import { Skeleton } from "@/shared/ui/Skeleton";

import type { MonthlySummary } from "../domain/movement-summary";

const CARD_CLASSES =
  "rounded-2xl bg-surface lit-surface px-4 text-xs shadow-card";

/**
 * Each part after the month starts with its middle dot (decorative). The line wraps on
 * narrow screens; the parts are shifted one dot to the left and the line is clipped at
 * its start, so a part that begins a new line hides its dot instead of dangling it.
 */
const PART_CLASSES =
  "flex items-baseline gap-1 before:-mr-1 before:w-[18px] before:text-center before:text-muted before:content-['·']";

/**
 * "Octubre · Ingresos +US$ 95 · Egresos −US$ 250": one compact line per currency, in the
 * list's card style (the line wraps on very narrow screens). Each currency is totaled on
 * its own, never added to another. With one currency it is the design's single line; with
 * more, the month heads the card and each currency gets its own line underneath, so the
 * dollar and peso totals read as rows instead of wrapping into each other.
 *
 * Income takes the "received" color, as in the rows; expenses stay neutral because they
 * mix two types (sent and automatic debits) with different colors. Amounts are spoken
 * with their currency ("más 95 dólares").
 */
export function MonthlySummaryView({ summary }: { summary: MonthlySummary }) {
  const monthName = formatMonthName(summary.month);
  const isMultiCurrency = summary.totals.length > 1;
  return (
    <section aria-label={`Resumen de ${monthName}`} className={CARD_CLASSES}>
      <div className="-ml-[18px] flex min-h-11 flex-wrap content-center items-baseline gap-y-0.5 py-1.5 [clip-path:inset(0_0_0_18px)]">
        <h2 className={`${PART_CLASSES} font-medium text-foreground`}>
          {monthName}
        </h2>
        {summary.totals.map((totals) => (
          <Fragment key={totals.currency}>
            {isMultiCurrency ? (
              <span aria-hidden="true" className="basis-full" />
            ) : null}
            <dl className="contents" data-currency={totals.currency}>
              <div className={PART_CLASSES}>
                <dt className="text-muted">Ingresos</dt>
                <dd className="font-semibold text-received tabular-nums">
                  <Money
                    value={totals.income}
                    currency={totals.currency}
                    direction="in"
                  />
                </dd>
              </div>
              <div className={PART_CLASSES}>
                <dt className="text-muted">Egresos</dt>
                <dd className="font-semibold text-foreground tabular-nums">
                  <Money
                    value={totals.expenses}
                    currency={totals.currency}
                    direction="out"
                  />
                </dd>
              </div>
            </dl>
          </Fragment>
        ))}
      </div>
    </section>
  );
}

/** Same footprint as the summary, so the list below does not move when it arrives. */
export function MonthlySummarySkeleton() {
  return (
    <div
      aria-hidden="true"
      className={`${CARD_CLASSES} flex h-11 items-center gap-2`}
    >
      <Skeleton className="h-3 w-14 rounded-md" />
      <Skeleton className="h-3 w-24 rounded-md" />
      <Skeleton className="h-3 w-24 rounded-md" />
    </div>
  );
}
