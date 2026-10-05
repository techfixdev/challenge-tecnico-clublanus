import { ROUTES } from "@/shared/lib/routes";

import type { Movement } from "../domain/movement";
import { MovementRow } from "./MovementRow";

type MovementListProps = {
  movements: Movement[];
  /**
   * Query string appended to each detail link (e.g. the active filters), so "Volver" on the
   * detail returns to the same filtered list.
   */
  detailSearch?: string;
};

export function movementDetailHref(id: string, detailSearch = ""): string {
  return detailSearch
    ? `${ROUTES.movement(id)}?${detailSearch}`
    : ROUTES.movement(id);
}

/** Flat list of movement cards, as in the design. */
export function MovementList({ movements, detailSearch }: MovementListProps) {
  return (
    <ul aria-label="Lista de movimientos" className="flex flex-col gap-4">
      {movements.map((movement) => (
        <li key={movement.id}>
          <MovementRow
            movement={movement}
            href={movementDetailHref(movement.id, detailSearch)}
          />
        </li>
      ))}
    </ul>
  );
}
