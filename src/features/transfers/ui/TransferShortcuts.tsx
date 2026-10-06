import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { ROUTES } from "@/shared/lib/routes";
import { ReceiveIcon, SendIcon } from "@/shared/ui/icons";

import {
  QUICK_ACTION_MORPH,
  QUICK_ACTION_OPEN,
  QuickActionMorph,
} from "./QuickActionMorph";

type Shortcut = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  tile: string;
  morph: (typeof QUICK_ACTION_MORPH)[keyof typeof QUICK_ACTION_MORPH];
};

const SHORTCUTS: Shortcut[] = [
  {
    href: ROUTES.transfer,
    label: "Enviar",
    Icon: SendIcon,
    morph: QUICK_ACTION_MORPH.transfer,
    tile: "bg-primary lit text-white inset-shadow-specular",
  },
  {
    href: ROUTES.receive,
    label: "Recibir",
    Icon: ReceiveIcon,
    morph: QUICK_ACTION_MORPH.receive,
    tile: "bg-primary-soft/60 lit-soft text-primary inset-shadow-specular-soft",
  },
];

/**
 * Home quick actions under the cards (not in the Figma): two equal tiles in the movement
 * rows' language (white surface, soft shadow, icon tile). "Enviar" carries the brand fill
 * because it is the primary action.
 *
 * Each tile is a size container: when it gets too narrow for icon + label side by side
 * (small phones, Android page zoom shrinking the CSS viewport), the label moves under the
 * icon instead of being cut. `min-w-0` lets the grid cells shrink below their content.
 *
 * Both are full prefetches: they are the likely next screens, so they open ready instead
 * of on their skeleton (the default prefetch of a dynamic route stops at its loading.tsx).
 * That also lets each tile grow into its screen (container transform, see QuickActionMorph).
 */
export function TransferShortcuts() {
  return (
    <nav aria-label="Acciones rápidas" className="px-6">
      <ul className="grid grid-cols-2 gap-4">
        {SHORTCUTS.map(({ href, label, Icon, tile, morph }) => (
          <li key={href} className="@container min-w-0">
            <QuickActionMorph name={morph}>
              <Link
                href={href}
                prefetch
                transitionTypes={[QUICK_ACTION_OPEN]}
                className="flex pressable flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface lit-surface px-2 py-3 shadow-card hover:text-primary focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none active:shadow-1 @[9rem]:h-14 @[9rem]:flex-row @[9rem]:justify-start @[9rem]:gap-3 @[9rem]:p-2 @[9rem]:pr-4"
              >
                <span
                  aria-hidden="true"
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tile}`}
                >
                  <Icon className="size-5" />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {label}
                </span>
              </Link>
            </QuickActionMorph>
          </li>
        ))}
      </ul>
    </nav>
  );
}
