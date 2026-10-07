import type { ComponentType, SVGProps } from "react";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  SwapVerticalIcon,
} from "@/shared/ui/icons";

import type { MovementType } from "../domain/movement";

/**
 * Visual language per movement type, on its icon tile. The amount is toned by direction
 * instead (see MovementAmount), so the type's color lives on the tile alone.
 */
export const MOVEMENT_TYPE_STYLE: Record<
  MovementType,
  {
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
    tile: string;
  }
> = {
  SUBSCRIPTION: {
    Icon: SwapVerticalIcon,
    tile: "bg-subscription-soft text-subscription",
  },
  RECEIVED: {
    Icon: ArrowDownIcon,
    tile: "bg-received-soft text-received",
  },
  SENT: {
    Icon: ArrowUpIcon,
    tile: "bg-sent-soft text-sent",
  },
};

const SIZE_CLASSES = {
  sm: { tile: "size-10 rounded-xl", icon: "size-5" },
  md: { tile: "size-12 rounded-xl", icon: "size-5" },
  lg: { tile: "size-20 rounded-3xl", icon: "size-9" },
} as const;

/** Decorative tile; the type is announced as text by the component that uses it. */
export function MovementTypeIcon({
  type,
  size = "md",
}: {
  type: MovementType;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const { Icon, tile } = MOVEMENT_TYPE_STYLE[type];
  const sizes = SIZE_CLASSES[size];
  return (
    <span
      data-testid="movement-icon"
      className={`flex shrink-0 items-center justify-center lit-soft inset-shadow-specular-soft ${sizes.tile} ${tile}`}
    >
      <Icon className={sizes.icon} />
    </span>
  );
}
