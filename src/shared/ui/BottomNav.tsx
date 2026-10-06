"use client";

import * as m from "motion/react-m";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { ROUTES } from "@/shared/lib/routes";

import { HomeIcon, ListIcon, LogoutIcon } from "./icons";
import { INDICATOR_SPRING, INSTANT, PRESS_SPRING } from "./motion/springs";
import { useReducedMotionPreference } from "./reduced-motion";

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /**
   * `true`: full prefetch, so the screen opens ready instead of on its skeleton (the
   * default prefetch of a dynamic route stops at its loading.tsx). Kept for the likely
   * next screen only: each full prefetch is a server render.
   */
  prefetch?: true;
};

const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.home, label: "Inicio", Icon: HomeIcon },
  {
    href: ROUTES.movements,
    label: "Movimientos",
    Icon: ListIcon,
    prefetch: true,
  },
];

/** "page" on the exact URL; "true" inside the section (e.g. a movement detail). */
function currentState(
  pathname: string,
  href: string,
): "page" | "true" | undefined {
  if (pathname === href) return "page";
  if (href !== ROUTES.home && pathname.startsWith(`${href}/`)) return "true";
  return undefined;
}

const ITEM_CLASSES =
  "relative flex size-14 items-center justify-center rounded-2xl transition-colors focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none";

/** The icon springs down a little while pressed (instead of the CSS press scale). */
function TapIcon({
  reduced,
  children,
}: {
  reduced: boolean;
  children: ReactNode;
}) {
  return (
    <m.span
      className="relative flex size-full items-center justify-center"
      whileTap={reduced ? undefined : { scale: 0.86 }}
      transition={PRESS_SPRING}
    >
      {children}
    </m.span>
  );
}

/**
 * App navigation from the design: Home, Movements and Logout, fixed to the bottom of the
 * phone-width column. Logout is a form posting to the Server Action it receives, which
 * keeps this shared component independent from the auth feature.
 *
 * The bar is frosted glass, and the current section sits on a soft granate pill. The
 * pill is one shared element (`layoutId`): when the section changes, Motion measures
 * the old and new positions and springs the same pill between them with transforms.
 * The nav lives in the layout, so it persists across navigations and can animate.
 */
export function BottomNav({
  logoutAction,
}: {
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const reduced = useReducedMotionPreference();

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[420px] rounded-t-[28px] glass pb-[env(safe-area-inset-bottom)] shadow-float inset-shadow-specular-glass"
    >
      {/* The side padding shrinks on very narrow viewports (page zoom), so the three items
          always fit; from about 216px wide it is the design's 24px. */}
      <ul className="flex h-20 items-center justify-around px-[clamp(0px,calc((100%-10.5rem)/2),1.5rem)]">
        {NAV_ITEMS.map(({ href, label, Icon, prefetch }) => {
          const current = currentState(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                prefetch={prefetch}
                aria-current={current}
                className={`${ITEM_CLASSES} ${current ? "text-primary" : "text-foreground hover:text-primary"}`}
              >
                {current && (
                  <m.span
                    layoutId="bottom-nav-indicator"
                    data-testid="nav-indicator"
                    className="absolute inset-0 rounded-2xl bg-primary/10"
                    transition={reduced ? INSTANT : INDICATOR_SPRING}
                  />
                )}
                <TapIcon reduced={reduced}>
                  <Icon className="size-[26px]" />
                </TapIcon>
                <span className="sr-only">{label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <form action={logoutAction}>
            <button
              type="submit"
              className={`${ITEM_CLASSES} text-foreground hover:text-primary`}
            >
              <TapIcon reduced={reduced}>
                <LogoutIcon className="size-[26px]" />
              </TapIcon>
              <span className="sr-only">Cerrar sesión</span>
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
