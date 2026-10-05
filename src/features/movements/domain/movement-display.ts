import { formatMoney } from "@/shared/lib/format";

import type { Movement, MovementStatus, MovementType } from "./movement";

export const MOVEMENT_TYPE_LABEL: Record<MovementType, string> = {
  SUBSCRIPTION: "Débito automático",
  RECEIVED: "Recibido",
  SENT: "Enviado",
};

export const MOVEMENT_STATUS_LABEL: Record<MovementStatus, string> = {
  COMPLETED: "Completado",
  PENDING: "Pendiente",
};

// U+2212 MINUS SIGN: typographically correct and read as "menos" by screen readers.
const MINUS = "−";

/** "+$95" for money in, "−$125" for money out (detail screen). */
export function formatSignedAmount(
  movement: Pick<Movement, "type" | "amount">,
): string {
  const sign = movement.type === "RECEIVED" ? "+" : MINUS;
  return `${sign}${formatMoney(movement.amount)}`;
}

/** "1 movimiento", "26 movimientos". */
export function formatMovementCount(count: number): string {
  return count === 1 ? "1 movimiento" : `${count} movimientos`;
}
