import Link from "next/link";

import { ScrollActiveIntoView } from "@/shared/ui/ScrollActiveIntoView";

import type { MovementType } from "../domain/movement";
import {
  buildMovementsHref,
  type MovementFilters,
} from "../domain/movement-filters";

const CHIPS: { label: string; type: MovementType | undefined }[] = [
  { label: "Todos", type: undefined },
  { label: "Débito Aut.", type: "SUBSCRIPTION" },
  { label: "Recibido", type: "RECEIVED" },
  { label: "Enviado", type: "SENT" },
];

/**
 * Quick filters as plain links: each one is a URL (shareable, back-button friendly, no
 * client JavaScript). The search text is preserved when switching type.
 */
export function FilterChips({ filters }: { filters: MovementFilters }) {
  return (
    <nav aria-label="Filtrar por tipo" className="-mx-6">
      <ScrollActiveIntoView
        activeKey={filters.type ?? "all"}
        className="flex snap-x scroll-px-6 [scrollbar-width:none] gap-3 overflow-x-auto px-6 pt-1 pb-3"
      >
        {CHIPS.map(({ label, type }) => {
          const isActive = filters.type === type;
          return (
            <li key={label} className="shrink-0 snap-start">
              <Link
                href={buildMovementsHref({ query: filters.query, type })}
                aria-current={isActive ? "true" : undefined}
                scroll={false}
                className={`inline-flex h-11 items-center rounded-2xl px-5 text-[13px] font-medium whitespace-nowrap shadow-card transition-colors focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none ${
                  isActive
                    ? "bg-primary text-white"
                    : "bg-surface text-foreground hover:bg-primary-soft/40"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ScrollActiveIntoView>
    </nav>
  );
}
