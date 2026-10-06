import type { CSSProperties } from "react";

import { ROUTES } from "@/shared/lib/routes";

import type { Movement } from "../domain/movement";
import { rowEnterStep } from "./movement-motion";
import { MovementRow } from "./MovementRow";

type MovementListProps = {
  movements: Movement[];
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
 * Flat list of movement cards, as in the design. Rows fade and slide up a few pixels,
 * one after another, when they are inserted: on the first render, on each new result set
 * (the results remount per search) and for rows appended by "Cargar más". A CSS
 * animation only runs on insertion, so re-renders of rows already on screen never replay it.
 */
export function MovementList({
  movements,
  detailSearch,
  enterFrom = 0,
}: MovementListProps) {
  return (
    <ul aria-label="Lista de movimientos" className="flex flex-col gap-4">
      {movements.map((movement, index) => (
        <li
          key={movement.id}
          className="row-enter"
          style={rowEnterStyle(index, enterFrom)}
        >
          <MovementRow
            movement={movement}
            href={movementDetailHref(movement.id, detailSearch)}
          />
        </li>
      ))}
    </ul>
  );
}
