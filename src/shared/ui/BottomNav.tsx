"use client";

import * as m from "motion/react-m";
import { usePathname } from "next/navigation";
import {
  useEffect,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";

import { ROUTES } from "@/shared/lib/routes";

import { HomeIcon, ListIcon, LogoutIcon } from "./icons";
import { MotionLink } from "./motion/MotionLink";
import { PINNED_CHROME, TAB_SWITCH } from "./motion/navigation";
import { installPinnedChromeTaps } from "./motion/pinned-chrome-taps";
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

/**
 * Focused tasks: screens that hide the nav, so the task's own pinned action owns the
 * bottom of the screen and the only ways out are finishing or its back control.
 */
const FOCUSED_TASK_ROUTES: readonly string[] = [ROUTES.transfer];

function isFocusedTask(pathname: string): boolean {
  return FOCUSED_TASK_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * `aria-current` of an item: "page" on its exact URL, "true" inside its section (e.g. a
 * movement detail).
 */
function ariaCurrentFor(
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
 * App navigation, as in the design: the two sections, Home and Movements, and on the
 * right "Cerrar sesión", fixed to the bottom of the phone-width column. Signing out is
 * a plain submit button of the logout Server Action (injected by the signed-in layout,
 * so this shared component does not depend on the auth feature; tests pass a fake). It
 * has no confirmation, like the design, but it only fires on a press: a button submits
 * on a pointer released on it, so a drag that starts or ends elsewhere never signs out.
 * Sending and receiving are Home's quick actions. Inside a focused task (the send flow)
 * the nav steps aside entirely; `--nav-clearance` drops to zero without it (globals.css).
 *
 * The bar is frosted glass, and the current section sits on a soft granate pill. The
 * pill is one shared element (`layoutId`): when the section changes, Motion measures
 * the old and new positions and springs the same pill between them with transforms.
 * The nav lives in the layout, so it persists across navigations and can animate.
 *
 * Switching sections is a tab switch (`nav-tab`: the screens swap instantly, no slide), and
 * the bar has its own view-transition name, so it stays put above the moving screens.
 * A tap on it while a transition runs still reaches its item (see pinned-chrome-taps.ts).
 */
export function BottomNav({
  logoutAction,
}: {
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const reduced = useReducedMotionPreference();
  // The nav lives in the signed-in layout: one guard for all of its pinned chrome.
  useEffect(() => installPinnedChromeTaps(), []);

  if (isFocusedTask(pathname)) return null;

  return (
    <nav
      aria-label="Principal"
      data-bottom-nav
      data-pinned-chrome
      style={{ viewTransitionName: PINNED_CHROME.bottomNav }}
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[420px] rounded-t-[28px] glass pb-[env(safe-area-inset-bottom)] shadow-float inset-shadow-specular-glass"
    >
      {/* The side padding shrinks on very narrow viewports (page zoom), so the items
          always fit; from about 216px wide it is the design's 24px. */}
      <ul className="flex h-20 items-center justify-around px-[clamp(0px,calc((100%-10.5rem)/2),1.5rem)]">
        {NAV_ITEMS.map(({ href, label, Icon, prefetch }) => {
          const current = ariaCurrentFor(pathname, href);
          return (
            <li key={href}>
              <MotionLink
                href={href}
                prefetch={prefetch}
                transitionTypes={TAB_SWITCH}
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
              </MotionLink>
            </li>
          );
        })}
        <li>
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Cerrar sesión"
              className={`${ITEM_CLASSES} text-foreground hover:text-primary`}
            >
              <TapIcon reduced={reduced}>
                <LogoutIcon className="size-[26px]" />
              </TapIcon>
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
