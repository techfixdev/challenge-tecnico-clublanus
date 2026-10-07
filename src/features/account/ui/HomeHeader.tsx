import type { ReactNode } from "react";

import { ROUTES } from "@/shared/lib/routes";
import { GlassHeader } from "@/shared/ui/GlassHeader";
import { SECTION_PUSH } from "@/shared/ui/motion/navigation";
import { SearchIcon } from "@/shared/ui/icons";

import { NotificationsButton } from "./NotificationsButton";
import { MotionLink } from "@/shared/ui/motion/MotionLink";

/** Link from the search icon: lands on Movements with the search box focused. */
const SEARCH_FROM_HOME_HREF = `${ROUTES.movements}?focus=1`;

/**
 * Home's header: the greeting, search, notifications and, last, the profile entry point
 * (passed in by the page, so this feature does not depend on the auth one).
 */
export function HomeHeader({
  firstName,
  profile,
}: {
  firstName: string;
  profile?: ReactNode;
}) {
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
          {profile}
        </>
      }
    />
  );
}
