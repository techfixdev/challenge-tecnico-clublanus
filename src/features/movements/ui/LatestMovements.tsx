import Link from "next/link";

import { ROUTES } from "@/shared/lib/routes";

import type { Movement } from "../domain/movement";
import { DETAIL_FROM_HOME } from "../domain/movement-filters";
import { movementDetailHref, rowEnterStyle } from "./MovementList";
import { MovementRow } from "./MovementRow";

/** "Últimos movimientos" on Home: a flat list, as in the design, plus a link to all. */
export function LatestMovements({ movements }: { movements: Movement[] }) {
  return (
    <section aria-labelledby="latest-movements" className="px-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2
          id="latest-movements"
          className="text-base font-medium text-foreground"
        >
          Últimos movimientos
        </h2>
        <Link
          href={ROUTES.movements}
          className="rounded-md text-xs font-medium text-primary hover:underline focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
        >
          Ver todos
        </Link>
      </div>
      {movements.length === 0 ? (
        <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted shadow-card">
          Todavía no tenés movimientos.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {movements.map((movement, index) => (
            <li
              key={movement.id}
              className="row-enter"
              style={rowEnterStyle(index)}
            >
              <MovementRow
                movement={movement}
                href={movementDetailHref(movement.id, DETAIL_FROM_HOME)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
