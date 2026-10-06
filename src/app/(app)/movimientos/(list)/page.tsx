import type { Metadata } from "next";
import { Suspense } from "react";

import { requireUser } from "@/features/auth/server/current-user";
import {
  parseMovementFilters,
  toMovementSearchParams,
} from "@/features/movements/domain/movement-filters";
import { FilterChips } from "@/features/movements/ui/FilterChips";
import { MonthlySummary } from "@/features/movements/ui/MonthlySummary";
import { MonthlySummarySkeleton } from "@/features/movements/ui/MonthlySummaryView";
import { MovementListSkeleton } from "@/features/movements/ui/MovementListSkeleton";
import { MovementResults } from "@/features/movements/ui/MovementResults";
import { MovementSearch } from "@/features/movements/ui/MovementSearch";

export const metadata: Metadata = {
  title: "Movimientos · GranaBank",
};

export default async function MovementsPage({
  searchParams,
}: PageProps<"/movimientos">) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = parseMovementFilters(params);

  return (
    <main className="flex flex-col gap-5 px-6 pt-10">
      <h1 className="text-xl font-semibold text-foreground">Movimientos</h1>
      {/* This month's totals; independent of the search and type filter below. */}
      <Suspense fallback={<MonthlySummarySkeleton />}>
        <MonthlySummary userId={user.id} />
      </Suspense>
      <MovementSearch filters={filters} autoFocus={params.focus === "1"} />
      <FilterChips filters={filters} />
      {/* Keyed by the filters: a new search remounts the boundary and shows the skeleton,
          while the header, search box and chips above stay mounted (focus is kept). */}
      <Suspense
        key={toMovementSearchParams(filters).toString()}
        fallback={<MovementListSkeleton />}
      >
        <MovementResults userId={user.id} filters={filters} />
      </Suspense>
    </main>
  );
}
