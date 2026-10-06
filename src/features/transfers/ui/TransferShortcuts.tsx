import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { ROUTES } from "@/shared/lib/routes";
import { ReceiveIcon, SendIcon } from "@/shared/ui/icons";

type Shortcut = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  tile: string;
};

const SHORTCUTS: Shortcut[] = [
  {
    href: ROUTES.transfer,
    label: "Enviar",
    Icon: SendIcon,
    tile: "bg-primary text-white",
  },
  {
    href: ROUTES.receive,
    label: "Recibir",
    Icon: ReceiveIcon,
    tile: "bg-primary-soft/60 text-primary",
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
 */
export function TransferShortcuts() {
  return (
    <nav aria-label="Acciones rápidas" className="px-6">
      <ul className="grid grid-cols-2 gap-4">
        {SHORTCUTS.map(({ href, label, Icon, tile }) => (
          <li key={href} className="@container min-w-0">
            <Link
              href={href}
              className="flex pressable flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface px-2 py-3 shadow-card hover:text-primary focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none @[9rem]:h-14 @[9rem]:flex-row @[9rem]:justify-start @[9rem]:gap-3 @[9rem]:p-2 @[9rem]:pr-4"
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
          </li>
        ))}
      </ul>
    </nav>
  );
}
