import { dayOf, formatDayLabel } from "@/shared/lib/dates";

/** The movements of one calendar day (Buenos Aires), under the header that names it. */
export type MovementDay<T> = {
  /** "2026-10-05": stable across pages, so it keys the group. */
  day: string;
  /** "Hoy", "Ayer", "5 de octubre". */
  label: string;
  movements: T[];
};

/**
 * Groups a newest-first list by day, keeping its order. Pages loaded with "Cargar más"
 * are appended before grouping, so a page that continues a day joins that day's group
 * instead of opening a second one. `today` is a day key (`dayOf`), decided once by the
 * caller, so the server and the browser label the same days alike.
 */
export function groupMovementsByDay<T extends { occurredAt: Date }>(
  movements: readonly T[],
  today: string,
): MovementDay<T>[] {
  const groups = new Map<string, MovementDay<T>>();
  for (const movement of movements) {
    const day = dayOf(movement.occurredAt);
    const group = groups.get(day);
    if (group) group.movements.push(movement);
    else
      groups.set(day, {
        day,
        label: formatDayLabel(day, today),
        movements: [movement],
      });
  }
  return [...groups.values()];
}
