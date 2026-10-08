import type { MoneyDirection } from "@/shared/lib/format";

import type { MovementStatus, MovementType } from "./movement";

export const MOVEMENT_TYPE_LABEL: Record<MovementType, string> = {
  SUBSCRIPTION: "Débito automático",
  RECEIVED: "Recibido",
  SENT: "Enviado",
};

export const MOVEMENT_STATUS_LABEL: Record<MovementStatus, string> = {
  COMPLETED: "Completado",
  PENDING: "Pendiente",
};

/** The direction of a movement's money: received comes in, the rest goes out. */
export function movementDirection(type: MovementType): MoneyDirection {
  return type === "RECEIVED" ? "in" : "out";
}

/** "1 movimiento", "26 movimientos". */
export function formatMovementCount(count: number): string {
  return count === 1 ? "1 movimiento" : `${count} movimientos`;
}
