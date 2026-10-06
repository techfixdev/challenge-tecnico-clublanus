import { formatMonthName } from "@/shared/lib/dates";
import { Skeleton } from "@/shared/ui/Skeleton";

import { formatSummaryAmount } from "../domain/movement-display";
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
 * "Octubre · Ingresos +$95 · Egresos −$250": one compact line, in the list's card style
 * (two or three lines on very narrow screens). Income takes the "received" color, as in
 * the rows; expenses stay neutral because they mix two types (sent and automatic debits)
 * with different colors.
 */
export function MonthlySummaryView({ summary }: { summary: MonthlySummary }) {
  const monthName = formatMonthName(summary.month);
  return (
    <section aria-label={`Resumen de ${monthName}`} className={CARD_CLASSES}>
      <div className="-ml-[18px] flex min-h-11 flex-wrap content-center items-baseline gap-y-0.5 py-1.5 [clip-path:inset(0_0_0_18px)]">
        <h2 className={`${PART_CLASSES} font-medium text-foreground`}>
          {monthName}
        </h2>
        <dl className="contents">
          <div className={PART_CLASSES}>
            <dt className="text-muted">Ingresos</dt>
            <dd className="font-semibold text-received tabular-nums">
              {formatSummaryAmount(summary.income, "in")}
            </dd>
          </div>
          <div className={PART_CLASSES}>
            <dt className="text-muted">Egresos</dt>
            <dd className="font-semibold text-foreground tabular-nums">
              {formatSummaryAmount(summary.expenses, "out")}
            </dd>
          </div>
        </dl>
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
