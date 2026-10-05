import Link from "next/link";

import { ROUTES } from "@/shared/lib/routes";
import { ListIcon, SearchIcon } from "@/shared/ui/icons";

import {
  hasActiveFilters,
  type MovementFilters,
} from "../domain/movement-filters";

/**
 * Two different empty states: an account without movements at all, and a search or
 * filter that matched nothing (which offers a way out).
 */
export function MovementsEmptyState({ filters }: { filters: MovementFilters }) {
  const isFiltered = hasActiveFilters(filters);
  const Icon = isFiltered ? SearchIcon : ListIcon;

  let title = "Todavía no tenés movimientos";
  let description = "Cuando pagues o recibas dinero, lo vas a ver acá.";
  if (filters.query) {
    title = `No encontramos movimientos para “${filters.query}”`;
    description = "Probá con otro nombre o servicio.";
  } else if (isFiltered) {
    title = "No encontramos movimientos con este filtro";
    description = "Probá con otro tipo de movimiento.";
  }

  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-primary-soft/50 text-primary">
        <Icon className="size-7" />
      </span>
      <h2 className="mt-5 text-base font-semibold text-balance text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      {isFiltered && (
        <Link
          href={ROUTES.movements}
          className="mt-6 inline-flex h-11 items-center rounded-2xl bg-primary px-6 text-sm font-semibold text-white shadow-card transition-colors hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
        >
          Limpiar filtros
        </Link>
      )}
    </div>
  );
}
