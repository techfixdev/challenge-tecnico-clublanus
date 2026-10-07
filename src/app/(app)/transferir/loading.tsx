import { ScreenTransition } from "@/shared/ui/motion/ScreenTransition";
import { Skeleton } from "@/shared/ui/Skeleton";

/**
 * Same frame as the first step: back control, progress, title, field, and the button
 * pinned to the bottom of the screen like the step's own (StepActions).
 */
export default function TransferLoading() {
  return (
    <ScreenTransition placeholder>
      <div aria-busy="true" className="flex flex-1 flex-col px-6 pt-8">
        <span className="sr-only">Cargando…</span>
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-24 rounded-2xl" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="mt-6 h-1 w-full rounded-full" />
        <Skeleton className="mt-6 h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
        <Skeleton className="mt-8 h-4 w-20" />
        <Skeleton className="mt-2 h-12 w-full rounded-xl" />
        <div className="-mx-6 mt-auto px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      </div>
    </ScreenTransition>
  );
}
