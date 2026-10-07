import { MotionLink } from "@/shared/ui/motion/MotionLink";
import { IN_PLACE } from "@/shared/ui/motion/navigation";
import { ScrollActiveIntoView } from "@/shared/ui/ScrollActiveIntoView";

import type { MovementType } from "../domain/movement";
import {
  buildMovementsHref,
  type MovementFilters,
} from "../domain/movement-search-params";

const CHIPS: { label: string; type: MovementType | undefined }[] = [
  { label: "Todos", type: undefined },
  { label: "Débito Aut.", type: "SUBSCRIPTION" },
  { label: "Recibido", type: "RECEIVED" },
  { label: "Enviado", type: "SENT" },
];

/**
 * Quick filters as plain links: each one is a URL (shareable, back-button friendly, no
 * client JavaScript). The search text is preserved when switching type.
 *
 * The right edge fades out to hint that the row scrolls horizontally. The fade is as wide
 * as the row's end padding, so the last chip is fully visible once scrolled to the end.
 */
export function FilterChips({ filters }: { filters: MovementFilters }) {
  return (
    <nav aria-label="Filtrar por tipo" className="-mx-6">
      <ScrollActiveIntoView
        activeKey={filters.type ?? "all"}
        className="flex snap-x scroll-px-6 [scrollbar-width:none] gap-3 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)] px-6 pt-1 pb-3"
      >
        {CHIPS.map(({ label, type }) => {
          const isActive = filters.type === type;
          return (
            <li key={label} className="shrink-0 snap-start">
              <MotionLink
                href={buildMovementsHref({ query: filters.query, type })}
                transitionTypes={IN_PLACE}
                aria-current={isActive ? "true" : undefined}
                scroll={false}
                className={`inline-flex h-11 pressable items-center rounded-2xl px-5 text-[13px] font-medium whitespace-nowrap focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none ${
                  isActive
                    ? "bg-primary lit text-white shadow-raised inset-shadow-specular active:shadow-pressed active:inset-shadow-pressed"
                    : "bg-surface lit-surface text-foreground shadow-card hover:bg-primary-soft/40 active:shadow-1"
                }`}
              >
                {label}
              </MotionLink>
            </li>
          );
        })}
      </ScrollActiveIntoView>
    </nav>
  );
}
