import { ROUTES } from "@/shared/lib/routes";
import { buttonClassName } from "@/shared/ui/Button";
import { ListIcon, SearchIcon } from "@/shared/ui/icons";
import { MotionLink } from "@/shared/ui/motion/MotionLink";
import { IN_PLACE } from "@/shared/ui/motion/navigation";

import {
  hasActiveFilters,
  type MovementFilters,
} from "../domain/movement-search-params";

function emptyStateCopy(filters: MovementFilters): {
  title: string;
  description: string;
} {
  if (filters.query) {
    return {
      title: `No encontramos movimientos para “${filters.query}”`,
      description: "Probá con otro nombre o servicio.",
    };
  }
  if (filters.type) {
    return {
      title: "No encontramos movimientos con este filtro",
      description: "Probá con otro tipo de movimiento.",
    };
  }
  return {
    title: "Todavía no tenés movimientos",
    description: "Cuando pagues o recibas dinero, lo vas a ver acá.",
  };
}

/**
 * Two different empty states: an account without movements at all, and a search or
 * filter that matched nothing (which offers a way out).
 */
export function MovementsEmptyState({ filters }: { filters: MovementFilters }) {
  const isFiltered = hasActiveFilters(filters);
  const Icon = isFiltered ? SearchIcon : ListIcon;
  const { title, description } = emptyStateCopy(filters);

  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-primary-soft/50 lit-soft text-primary inset-shadow-specular-soft">
        <Icon className="size-7" />
      </span>
      <h2 className="mt-5 text-base font-semibold text-balance text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      {isFiltered && (
        <MotionLink
          href={ROUTES.movements}
          transitionTypes={IN_PLACE}
          className={buttonClassName({ size: "compact", className: "mt-6" })}
        >
          Limpiar filtros
        </MotionLink>
      )}
    </div>
  );
}
