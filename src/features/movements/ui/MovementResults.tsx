import "server-only";

import { dayOf } from "@/shared/lib/dates";

import { prismaMovementRepository } from "../data/prisma-movement-repository";
import { formatMovementCount } from "../domain/movement-display";
import {
  hasActiveFilters,
  type MovementFilters,
} from "../domain/movement-search-params";
import { listMovements } from "../domain/movement-queries";
import { LoadMoreMovements } from "./LoadMoreMovements";
import { MovementsEmptyState } from "./MovementsEmptyState";

/**
 * Container (Server Component): loads the first page for the current filters and picks the
 * presentational state. Rendered inside a Suspense boundary keyed by the filters, so each
 * new search shows the skeleton while it streams.
 */
export async function MovementResults({
  userId,
  filters,
}: {
  userId: string;
  filters: MovementFilters;
}) {
  const page = await listMovements(prismaMovementRepository, userId, {
    filters,
  });
  // Decided once, here: the browser labels the days as the server did ("Hoy", "Ayer").
  const today = dayOf(new Date());
  const isFiltered = hasActiveFilters(filters);
  const isEmpty = page.items.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Announces the result count to screen readers; visible only while filtering
          (the empty state already says it). */}
      <p
        role="status"
        className={
          isFiltered && !isEmpty ? "text-xs font-medium text-muted" : "sr-only"
        }
      >
        {formatMovementCount(page.total)}
      </p>
      {isEmpty ? (
        <MovementsEmptyState filters={filters} />
      ) : (
        <LoadMoreMovements
          filters={filters}
          initialMovements={page.items}
          initialCursor={page.nextCursor}
          today={today}
        />
      )}
    </div>
  );
}
