import type { MoneyDirection } from "@/shared/lib/format";
import { Money } from "@/shared/ui/Money";

import type { MovementType } from "../domain/movement";
import { movementDirection } from "../domain/movement-display";

/**
 * Amount tone by direction, not by type: money in is garnet, money out stays in ink, so
 * the sign and one color read at a glance while the type keeps its own color on the tile.
 */
const AMOUNT_TONE: Record<MoneyDirection, string> = {
  in: "text-received",
  out: "text-foreground",
};

/**
 * A movement's amount with its direction: "+US$ 95" received, "−$ 11.999" sent or debited
 * (U+2212). Screen readers hear "más 95 dólares" / "menos 11.999 pesos" (see `Money`).
 */
export function MovementAmount({
  type,
  amount,
  currency,
  className = "",
}: {
  type: MovementType;
  amount: string;
  currency: string;
  className?: string;
}) {
  const direction = movementDirection(type);
  return (
    <span className={`tabular-nums ${AMOUNT_TONE[direction]} ${className}`}>
      <Money value={amount} currency={currency} direction={direction} />
    </span>
  );
}
