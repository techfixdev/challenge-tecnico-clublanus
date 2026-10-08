import { formatLongDate, formatTime } from "@/shared/lib/dates";
import { formatSignedMoney } from "@/shared/lib/format";

import type { Movement } from "./movement";
import { MOVEMENT_STATUS_LABEL, movementDirection } from "./movement-display";

/**
 * The receipt as plain text, for "Compartir comprobante" (the share sheet, or the
 * clipboard where there is none): who, the signed amount, when (Buenos Aires time), the
 * status and the reference. The card is left out on purpose: a receipt sent to someone
 * else needs no card digits.
 */
export function movementShareText(movement: Movement): string {
  const amount = formatSignedMoney(
    movement.amount,
    movement.currency,
    movementDirection(movement.type),
  );
  return [
    "Comprobante de GranaBank",
    `${movement.counterparty} · ${movement.description}`,
    amount,
    `${formatLongDate(movement.occurredAt)}, ${formatTime(movement.occurredAt)} h`,
    `Estado: ${MOVEMENT_STATUS_LABEL[movement.status]}`,
    `Referencia: ${movement.reference}`,
  ].join("\n");
}

/**
 * Who "Repetir transferencia" sends to: the recipient's alias of a transfer the user sent,
 * or null when there is nobody known to send to again (money received, a subscription, a
 * movement with no transfer behind it).
 */
export function repeatTransferAlias(movement: Movement): string | null {
  return movement.type === "SENT" ? (movement.recipientAlias ?? null) : null;
}
