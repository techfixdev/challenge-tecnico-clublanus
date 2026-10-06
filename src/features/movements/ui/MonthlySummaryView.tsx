import { formatMonthName } from "@/shared/lib/dates";
import { Skeleton } from "@/shared/ui/Skeleton";

import { formatSummaryAmount } from "../domain/movement-display";
import type { MonthlySummary } from "../domain/movement-summary";

const CARD_CLASSES =
  "flex h-11 items-center gap-2 rounded-2xl bg-surface px-4 text-xs shadow-card";

/** Middle dot between the parts of the line; decorative. */
function Separator() {
  return (
    <span aria-hidden="true" className="text-muted">
      ·
    </span>
  );
}

/**
 * "Octubre · Ingresos +$95 · Egresos −$250": one compact line, in the list's card style.
 * Income takes the "received" color, as in the rows; expenses stay neutral because they
 * mix two types (sent and automatic debits) with different colors.
 */
export function MonthlySummaryView({ summary }: { summary: MonthlySummary }) {
  const monthName = formatMonthName(summary.month);
  return (
    <section aria-label={`Resumen de ${monthName}`} className={CARD_CLASSES}>
      <h2 className="font-medium text-foreground">{monthName}</h2>
      <Separator />
      <dl className="flex items-center gap-2">
        <div className="flex items-baseline gap-1">
          <dt className="text-muted">Ingresos</dt>
          <dd className="font-semibold text-received tabular-nums">
            {formatSummaryAmount(summary.income, "in")}
          </dd>
        </div>
        <Separator />
        <div className="flex items-baseline gap-1">
          <dt className="text-muted">Egresos</dt>
          <dd className="font-semibold text-foreground tabular-nums">
            {formatSummaryAmount(summary.expenses, "out")}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/** Same footprint as the summary, so the list below does not move when it arrives. */
export function MonthlySummarySkeleton() {
  return (
    <div aria-hidden="true" className={CARD_CLASSES}>
      <Skeleton className="h-3 w-14 rounded-md" />
      <Skeleton className="h-3 w-24 rounded-md" />
      <Skeleton className="h-3 w-24 rounded-md" />
    </div>
  );
}
