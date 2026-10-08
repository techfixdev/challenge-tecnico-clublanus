import { PUSH } from "@/shared/ui/motion/navigation";
import { MotionLink } from "@/shared/ui/motion/MotionLink";

import type { Movement } from "../domain/movement";
import { MOVEMENT_TYPE_LABEL } from "../domain/movement-display";
import { MovementAmount } from "./MovementAmount";
import { MovementTile } from "./MovementTile";
import { MovementTypeIcon } from "./MovementTypeIcon";
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
 * One movement as a row of a grouped list (`grouped-list` in globals.css draws the
 * surface and the hairlines); the whole row links to its detail. The type tile is a
 * shared element: on navigation it morphs into the detail's large tile (and back), while
 * the detail is pushed in from the right (`nav-forward`).
 *
 * The row is flat: a tap tints it instead of lifting it, as rows inside one surface do.
 * On very narrow screens the amount wraps under the text instead of cutting it.
 */
export function MovementRow({ movement, href }: MovementRowProps) {
  const { id, counterparty, description, type, status, amount, currency } =
    movement;
  return (
    <MotionLink
      href={href}
      transitionTypes={PUSH}
      className="flex min-h-16 pressable flex-wrap items-center gap-x-3.5 gap-y-1 px-4 py-3 hover:bg-background focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none focus-visible:ring-inset active:bg-border/60"
    >
      <MovementTile id={id}>
        <MovementTypeIcon type={type} size="sm" />
      </MovementTile>
      <span className="flex min-w-0 flex-1 basis-20 flex-col gap-0.5">
        <span className="text-[15px] leading-5 font-medium text-foreground">
          {counterparty}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-2">
          <span className="min-w-0 text-[13px] leading-4 text-muted">
            {description}
          </span>
          {status === "PENDING" && <StatusBadge status={status} />}
        </span>
        <span className="sr-only">{MOVEMENT_TYPE_LABEL[type]}</span>
      </span>
      <MovementAmount
        type={type}
        amount={amount}
        currency={currency}
        className="ml-auto text-[15px] font-semibold"
      />
    </MotionLink>
  );
}
