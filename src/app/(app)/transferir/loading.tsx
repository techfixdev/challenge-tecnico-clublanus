import { Skeleton } from "@/shared/ui/Skeleton";

/** Same frame as the first step: back control, progress, title, field and button. */
export default function TransferLoading() {
  return (
    <div aria-busy="true" className="flex flex-col px-6 pt-8">
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
      <Skeleton className="mt-8 h-14 w-full rounded-2xl" />
    </div>
  );
}
