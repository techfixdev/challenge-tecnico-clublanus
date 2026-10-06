import Link from "next/link";

import { formatMoney } from "@/shared/lib/format";

import type { Movement } from "../domain/movement";
import { MOVEMENT_TYPE_LABEL } from "../domain/movement-display";
import { MovementTile } from "./MovementTile";
import { MovementTypeIcon, MOVEMENT_TYPE_STYLE } from "./MovementTypeIcon";
import { StatusBadge } from "./StatusBadge";

type MovementRowProps = {
  movement: Pick<
    Movement,
    | "id"
    | "counterparty"
    | "description"
    | "type"
    | "status"
    | "amount"
    | "currency"
  >;
  href: string;
};

/**
 * One movement as a card-like row; the whole row links to its detail. The type tile is a
 * shared element: on navigation it morphs into the detail's large tile (and back).
 */
export function MovementRow({ movement, href }: MovementRowProps) {
  const { id, counterparty, description, type, status, amount, currency } =
    movement;
  return (
    <Link
      href={href}
      className="flex pressable items-center gap-4 rounded-2xl bg-surface p-4 shadow-card hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none active:translate-y-0"
    >
      <MovementTile id={id}>
        <MovementTypeIcon type={type} />
      </MovementTile>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium text-foreground">
          {counterparty}
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-xs text-muted">{description}</span>
          {status === "PENDING" && <StatusBadge status={status} />}
        </span>
        <span className="sr-only">{MOVEMENT_TYPE_LABEL[type]}</span>
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${MOVEMENT_TYPE_STYLE[type].text}`}
      >
        {formatMoney(amount, currency)}
      </span>
    </Link>
  );
}
