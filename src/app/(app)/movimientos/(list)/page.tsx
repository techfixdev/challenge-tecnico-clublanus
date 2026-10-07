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
import { GlassHeader } from "@/shared/ui/GlassHeader";
import {
  RevealTransition,
  ScreenTransition,
  SkeletonTransition,
} from "@/shared/ui/motion/ScreenTransition";
import { StickyUnderHeader } from "@/shared/ui/StickyUnderHeader";

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
    <ScreenTransition>
      <main className="flex flex-col">
        {/* The search and chips draw the bar's bottom edge once they stick under it. */}
        <GlassHeader title="Movimientos" hairline={false} />
        <div className="flex flex-col gap-5 px-6 pt-2">
          {/* This month's totals; independent of the search and type filter below. */}
          <Suspense
            fallback={
              <SkeletonTransition>
                <MonthlySummarySkeleton />
              </SkeletonTransition>
            }
          >
            <RevealTransition>
              <MonthlySummary userId={user.id} />
            </RevealTransition>
          </Suspense>
          {/* Search and type filter are the controls of a long list: they stick under the
            compact header, while the month summary (context, not a control) scrolls away. */}
          <StickyUnderHeader>
            <MovementSearch
              filters={filters}
              autoFocus={params.focus === "1"}
            />
            <FilterChips filters={filters} />
          </StickyUnderHeader>
          {/* Keyed by the filters: a new search remounts the boundary and shows the skeleton,
            while the header, search box and chips above stay mounted (focus is kept). */}
          <Suspense
            key={toMovementSearchParams(filters).toString()}
            fallback={
              <SkeletonTransition>
                <MovementListSkeleton />
              </SkeletonTransition>
            }
          >
            <RevealTransition>
              <MovementResults userId={user.id} filters={filters} />
            </RevealTransition>
          </Suspense>
        </div>
      </main>
    </ScreenTransition>
  );
}
