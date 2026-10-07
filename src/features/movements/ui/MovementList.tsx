import type { CSSProperties } from "react";

import { ROUTES } from "@/shared/lib/routes";
import { COMPACT_HEADER_PX } from "@/shared/ui/glass-header";

import type { Movement } from "../domain/movement";
import { groupMovementsByDay } from "../domain/movement-days";
import { rowEnterStep } from "./movement-motion";
import { MovementRow } from "./MovementRow";
import { MOVEMENT_FILTERS_HEIGHT_VAR } from "./movement-list-layout";

type MovementListProps = {
  movements: Movement[];
  /** Today's day key (`dayOf`), decided by the server: "Hoy" and "Ayer" hang on it. */
  today: string;
  /**
   * Query string appended to each detail link (e.g. the active filters), so "Volver" on the
   * detail returns to the same filtered list.
   */
  detailSearch?: string;
  /** Index of the newest batch ("Cargar más"): its rows stagger in from 0. */
  enterFrom?: number;
};

export function movementDetailHref(id: string, detailSearch = ""): string {
  return detailSearch
    ? `${ROUTES.movement(id)}?${detailSearch}`
    : ROUTES.movement(id);
}

/** Style that staggers a row's entrance (`row-enter` utility in globals.css). */
export function rowEnterStyle(index: number, batchStart = 0): CSSProperties {
  return {
    "--row-enter-step": rowEnterStep(index, batchStart),
  } as CSSProperties;
}

/**
 * A day's header sticks right under the search and chips, which stick under the compact
 * header themselves (their height is measured by StickyFiltersHeight; 0 until then).
 * Each header sticks within its own day, so the next day's header pushes it away.
 */
const DAY_HEADER_STYLE: CSSProperties = {
  top: `calc(env(safe-area-inset-top) + ${COMPACT_HEADER_PX - 1}px + var(${MOVEMENT_FILTERS_HEIGHT_VAR}, 0px))`,
};

function dayHeadingId(day: string): string {
  return `movements-day-${day}`;
}

/**
 * Movements grouped by day ("Hoy", "Ayer", "5 de octubre"), each day one grouped surface
 * under a sticky header. Rows fade and slide up a few pixels, one after another, when they
 * are inserted: on the first render, on each new result set (the results remount per
 * search) and for rows appended by "Cargar más" (they join their day's group). A CSS
 * animation only runs on insertion, so re-renders of rows already on screen never replay it.
 */
export function MovementList({
  movements,
  today,
  detailSearch,
  enterFrom = 0,
}: MovementListProps) {
  let index = 0;
  return (
    <section aria-label="Lista de movimientos" className="flex flex-col">
      {groupMovementsByDay(movements, today).map((group) => (
        <div key={group.day}>
          <h2
            id={dayHeadingId(group.day)}
            className="sticky z-[5] -mx-6 glass px-7 pt-4 pb-2 text-[13px] leading-4 font-semibold text-muted"
            style={DAY_HEADER_STYLE}
          >
            {group.label}
          </h2>
          <ul
            aria-labelledby={dayHeadingId(group.day)}
            className="grouped-list"
          >
            {group.movements.map((movement) => (
              <li
                key={movement.id}
                className="row-enter"
                style={rowEnterStyle(index++, enterFrom)}
              >
                <MovementRow
                  movement={movement}
                  href={movementDetailHref(movement.id, detailSearch)}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
