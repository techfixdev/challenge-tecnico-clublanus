import { ScreenTransition } from "@/shared/ui/motion/ScreenTransition";
import { Skeleton } from "@/shared/ui/Skeleton";

export default function ReceiveLoading() {
  return (
    <ScreenTransition placeholder>
      <div aria-busy="true" className="flex flex-col px-6 pt-8">
        <span className="sr-only">Cargando tus datos…</span>
        <Skeleton className="h-10 w-24 rounded-2xl" />
        <Skeleton className="mt-6 h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
        <Skeleton className="mt-8 h-[228px] w-full rounded-3xl" />
        <Skeleton className="mt-6 h-[300px] w-full rounded-3xl" />
      </div>
    </ScreenTransition>
  );
}
