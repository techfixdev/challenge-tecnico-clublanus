import { ROUTES } from "@/shared/lib/routes";

import type { MovementType } from "./movement";

/**
 * Search and quick filters live in the URL (`/movimientos?q=adobe&type=recibido`), so a
 * filtered list is shareable, survives a reload and works with the back button.
 * The URL uses readable Spanish slugs; the domain uses the enum values.
 *
 * This module only builds URLs and has no validation library, so client components can
 * import it; parsing untrusted params is the server's job (`movement-filters.ts`).
 */

export const MOVEMENT_TYPE_SLUGS = {
  debito: "SUBSCRIPTION",
  recibido: "RECEIVED",
  enviado: "SENT",
} as const satisfies Record<string, MovementType>;

export type MovementTypeSlug = keyof typeof MOVEMENT_TYPE_SLUGS;

const SLUG_BY_TYPE: Record<MovementType, MovementTypeSlug> = {
  SUBSCRIPTION: "debito",
  RECEIVED: "recibido",
  SENT: "enviado",
};

export const SEARCH_MAX_LENGTH = 50;

export type MovementFilters = { query?: string; type?: MovementType };

/** Query string for the given filters (`q`, `type` as a slug), without the leading "?". */
export function toMovementSearchParams(
  filters: MovementFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.type) params.set("type", SLUG_BY_TYPE[filters.type]);
  return params;
}

/** `/movimientos` with the filters applied, e.g. `/movimientos?q=adobe&type=debito`. */
export function buildMovementsHref(filters: MovementFilters): string {
  const search = toMovementSearchParams(filters).toString();
  return search ? `${ROUTES.movements}?${search}` : ROUTES.movements;
}

export function hasActiveFilters(filters: MovementFilters): boolean {
  return Boolean(filters.query || filters.type);
}

/** Query string for detail links opened from Home, so "Volver" goes back there. */
export const DETAIL_FROM_HOME = "from=home";
