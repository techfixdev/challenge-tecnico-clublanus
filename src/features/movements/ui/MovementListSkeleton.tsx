import { Skeleton } from "@/shared/ui/Skeleton";

/** Same footprint as `MovementRow`, so content does not jump when it arrives. */
export function MovementRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-card">
      <Skeleton className="size-12 rounded-xl" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-2.5 w-36" />
      </div>
      <Skeleton className="h-3.5 w-12" />
    </div>
  );
}

export function MovementListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">Cargando movimientos…</span>
      {Array.from({ length: rows }, (_, index) => (
        <MovementRowSkeleton key={index} />
      ))}
    </div>
  );
}
