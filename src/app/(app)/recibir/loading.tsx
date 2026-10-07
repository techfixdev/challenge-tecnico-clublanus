import { ScreenTransition } from "@/shared/ui/motion/ScreenTransition";
import { Skeleton } from "@/shared/ui/Skeleton";

/** Same frame as the screen: navigation bar, title, details card and QR card. */
export default function ReceiveLoading() {
  return (
    <ScreenTransition placeholder>
      <div aria-busy="true" className="flex flex-col px-6 pt-8">
        <span className="sr-only">Cargando tus datos…</span>
        {/* The NavBar's frame: a 44px row with the chevron left and the title centered. */}
        <div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="mt-6 h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
        <Skeleton className="mt-8 h-[228px] w-full rounded-3xl" />
        <Skeleton className="mt-6 h-[300px] w-full rounded-3xl" />
      </div>
    </ScreenTransition>
  );
}
