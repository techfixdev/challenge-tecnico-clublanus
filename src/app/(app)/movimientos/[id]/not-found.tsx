import Link from "next/link";

import { ROUTES } from "@/shared/lib/routes";
import { buttonClassName } from "@/shared/ui/Button";
import { SearchIcon } from "@/shared/ui/icons";

/** Same answer for unknown, malformed and other users' ids: never confirms an id exists. */
export default function MovementNotFound() {
  return (
    <main className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-primary-soft/50 text-primary">
        <SearchIcon className="size-7" />
      </span>
      <h1 className="mt-5 text-lg font-semibold text-foreground">
        No encontramos este movimiento
      </h1>
      <p className="mt-1 text-sm text-muted">
        Puede que el enlace sea incorrecto o que el movimiento no sea de tu
        cuenta.
      </p>
      <Link
        href={ROUTES.movements}
        className={buttonClassName({ size: "compact", className: "mt-8" })}
      >
        Ver mis movimientos
      </Link>
    </main>
  );
}
