import { MovementGroupSkeleton } from "@/features/movements/ui/MovementListSkeleton";
import { ScreenTransition } from "@/shared/ui/motion/ScreenTransition";
import { Skeleton } from "@/shared/ui/Skeleton";

/**
 * Skeleton for Home only. It lives in a route group so its Suspense boundary does not
 * wrap `/movimientos/[id]`: a streamed response is committed as HTTP 200, and the detail
 * needs to answer a real 404 when `notFound()` runs.
 */
export default function HomeLoading() {
  return (
    <ScreenTransition placeholder>
      <div aria-busy="true" className="flex flex-col">
        <span className="sr-only">Cargando tu cuenta…</span>
        <div className="flex items-center justify-between px-6 pt-10">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="mt-8 px-6">
          <Skeleton className="h-[180px] w-[84%] rounded-3xl" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 px-6">
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
        </div>
        <div className="mt-8 flex flex-col gap-4 px-6">
          <Skeleton className="h-4 w-40" />
          <MovementGroupSkeleton rows={5} />
        </div>
      </div>
    </ScreenTransition>
  );
}
