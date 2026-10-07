import { MovementListSkeleton } from "@/features/movements/ui/MovementListSkeleton";
import { MonthlySummarySkeleton } from "@/features/movements/ui/MonthlySummaryView";
import { ScreenTransition } from "@/shared/ui/motion/ScreenTransition";
import { Skeleton } from "@/shared/ui/Skeleton";

/**
 * Skeleton for the movements list only. It lives in a route group so its Suspense boundary does not
 * wrap `/movimientos/[id]`: a streamed response is committed as HTTP 200, and the detail
 * needs to answer a real 404 when `notFound()` runs.
 */
export default function MovementsLoading() {
  return (
    <ScreenTransition placeholder>
      <div className="flex flex-col gap-5 px-6 pt-10">
        <Skeleton className="h-6 w-36" />
        <MonthlySummarySkeleton />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="flex gap-3 overflow-hidden">
          {[72, 104, 92, 88].map((width) => (
            <Skeleton
              key={width}
              className="h-11 shrink-0 rounded-2xl"
              style={{ width }}
            />
          ))}
        </div>
        <MovementListSkeleton />
      </div>
    </ScreenTransition>
  );
}
