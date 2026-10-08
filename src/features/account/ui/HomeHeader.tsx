import { ROUTES } from "@/shared/lib/routes";
import { GlassHeader } from "@/shared/ui/GlassHeader";
import { MotionLink } from "@/shared/ui/motion/MotionLink";
import { SECTION_PUSH } from "@/shared/ui/motion/navigation";
import { SearchIcon } from "@/shared/ui/icons";

import { NotificationsButton } from "./NotificationsButton";

/** Link from the search icon: lands on Movements with the search box focused. */
const SEARCH_FROM_HOME_HREF = `${ROUTES.movements}?focus=1`;

/**
 * Home's header, as in the design: the greeting, search and notifications. Signing out
 * is the bottom nav's last item.
 */
export function HomeHeader({ firstName }: { firstName: string }) {
  return (
    <GlassHeader
      eyebrow="Hola"
      title={firstName}
      actions={
        <>
          <MotionLink
            href={SEARCH_FROM_HOME_HREF}
            transitionTypes={SECTION_PUSH}
            aria-label="Buscar movimientos"
            className="flex size-10 pressable items-center justify-center rounded-full text-foreground hover:bg-surface focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
          >
            <SearchIcon className="size-[22px]" />
          </MotionLink>
          <NotificationsButton />
        </>
      }
    />
  );
}
