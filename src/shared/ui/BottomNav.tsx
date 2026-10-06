"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import { ROUTES } from "@/shared/lib/routes";

import { HomeIcon, ListIcon, LogoutIcon } from "./icons";

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.home, label: "Inicio", Icon: HomeIcon },
  { href: ROUTES.movements, label: "Movimientos", Icon: ListIcon },
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
  "flex size-14 items-center justify-center rounded-2xl pressable focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none";

/**
 * App navigation from the design: Home, Movements and Logout, fixed to the bottom of the
 * phone-width column. Logout is a form posting to the Server Action it receives, which
 * keeps this shared component independent from the auth feature.
 */
export function BottomNav({
  logoutAction,
}: {
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[420px] rounded-t-[28px] bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(30_34_53/0.12)]"
    >
      <ul className="flex h-20 items-center justify-around px-6">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const current = currentState(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current}
                className={`${ITEM_CLASSES} ${current ? "text-primary" : "text-foreground hover:text-primary"}`}
              >
                <Icon className="size-[26px]" />
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
              <LogoutIcon className="size-[26px]" />
              <span className="sr-only">Cerrar sesión</span>
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
