import { ROUTES } from "@/shared/lib/routes";
import { buttonClassName } from "@/shared/ui/Button";
import { SearchIcon } from "@/shared/ui/icons";
import { POP } from "@/shared/ui/motion/navigation";
import { MotionLink } from "@/shared/ui/motion/MotionLink";

/** Same answer for unknown, malformed and other users' ids: never confirms an id exists. */
export default function MovementNotFound() {
  return (
    <main className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-primary-soft/50 text-primary">
        <SearchIcon className="size-7" />
      </span>
      <h1 className="mt-5 font-display text-xl font-semibold text-foreground">
        No encontramos este movimiento
      </h1>
      <p className="mt-1 text-sm text-muted">
        Puede que el enlace sea incorrecto o que el movimiento no sea de tu
        cuenta.
      </p>
      <MotionLink
        href={ROUTES.movements}
        transitionTypes={POP}
        className={buttonClassName({ size: "compact", className: "mt-8" })}
      >
        Ver mis movimientos
      </MotionLink>
    </main>
  );
}
