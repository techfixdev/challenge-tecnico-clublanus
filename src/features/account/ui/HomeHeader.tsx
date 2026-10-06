import Link from "next/link";

import { ROUTES } from "@/shared/lib/routes";
import { SearchIcon } from "@/shared/ui/icons";

import { NotificationsButton } from "./NotificationsButton";

/** Link from the search icon: lands on Movements with the search box focused. */
const SEARCH_FROM_HOME_HREF = `${ROUTES.movements}?focus=1`;

export function HomeHeader({ firstName }: { firstName: string }) {
  return (
    <header className="flex items-center justify-between px-6 pt-10">
      <div>
        <p className="text-xs text-muted">Hola</p>
        <h1 className="text-xl font-semibold text-foreground">{firstName}</h1>
      </div>
      <div className="flex items-center gap-1">
        <Link
          href={SEARCH_FROM_HOME_HREF}
          aria-label="Buscar movimientos"
          className="flex size-10 pressable items-center justify-center rounded-full text-foreground hover:bg-surface focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
        >
          <SearchIcon className="size-[22px]" />
        </Link>
        <NotificationsButton />
      </div>
    </header>
  );
}
