import Link from "next/link";

import { ROUTES } from "@/shared/lib/routes";

import type { Movement } from "../domain/movement";
import { DETAIL_FROM_HOME } from "../domain/movement-search-params";
import { movementDetailHref, rowEnterStyle } from "./MovementList";
import { MovementRow } from "./MovementRow";

/** "Últimos movimientos" on Home: a flat list, as in the design, plus a link to all. */
export function LatestMovements({ movements }: { movements: Movement[] }) {
  return (
    <section aria-labelledby="latest-movements" className="px-6">
      {/* On very narrow screens the link moves under the title (right-aligned). */}
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="latest-movements"
          className="text-base font-medium text-foreground"
        >
          Últimos movimientos
        </h2>
        {/* Full prefetch: the list is a likely next screen, so it opens ready, without its
            skeleton (the default prefetch of a dynamic route stops at its loading.tsx). */}
        <Link
          href={ROUTES.movements}
          prefetch
          className="ml-auto shrink-0 rounded-md text-xs font-medium whitespace-nowrap text-primary hover:underline focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
        >
          Ver todos
        </Link>
      </div>
      {movements.length === 0 ? (
        <p className="rounded-2xl bg-surface lit-surface p-6 text-center text-sm text-muted shadow-card">
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
