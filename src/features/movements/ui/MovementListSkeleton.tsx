import { Skeleton } from "@/shared/ui/Skeleton";

/** Same footprint as `MovementRow`, so content does not jump when it arrives. */
function MovementRowSkeleton() {
  return (
    <div className="flex min-h-16 items-center gap-3.5 px-4 py-3">
      <Skeleton className="size-10 rounded-xl" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-2.5 w-36" />
      </div>
      <Skeleton className="h-3.5 w-14" />
    </div>
  );
}

/** Rows inside one grouped surface, with its hairlines, as the loaded list draws them. */
export function MovementGroupSkeleton({ rows }: { rows: number }) {
  return (
    <ul aria-hidden="true" className="grouped-list">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index}>
          <MovementRowSkeleton />
        </li>
      ))}
    </ul>
  );
}

/** A day header and its group, as the list of Movimientos starts. */
export function MovementListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="flex flex-col">
      <span className="sr-only">Cargando movimientos…</span>
      <div className="px-1 pt-4 pb-2">
        <Skeleton className="h-3 w-16" />
      </div>
      <MovementGroupSkeleton rows={rows} />
    </div>
  );
}
