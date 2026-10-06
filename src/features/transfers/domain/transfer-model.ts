import type { CardBrand } from "@/features/account/domain/card";

/**
 * The transfer vocabulary the send form shares with the server: outcomes, their messages
 * and the shapes the UI shows. No validation library and no use cases here, so client
 * components can import it without pulling the server's zod schema into the browser.
 */

export type TransferFailureReason =
  | "recipient_not_found"
  | "self_transfer"
  | "card_not_found"
  | "currency_mismatch"
  /** Above the per-transfer cap of the source card's currency. */
  | "amount_over_limit"
  | "insufficient_funds"
  /** The idempotency key was already used for a different transfer. */
  | "idempotency_conflict";

export const TRANSFER_FAILURE_MESSAGE: Record<TransferFailureReason, string> = {
  recipient_not_found: "No encontramos una cuenta con ese alias o CVU",
  self_transfer: "No podés transferirte a tu propia cuenta",
  card_not_found: "No encontramos esa tarjeta en tu cuenta",
  currency_mismatch:
    "La cuenta de destino no opera en la moneda de esta tarjeta. Probá con otra tarjeta.",
  amount_over_limit:
    "El monto supera el máximo por transferencia en la moneda de esta tarjeta",
  insufficient_funds: "No tenés saldo suficiente en esta tarjeta",
  idempotency_conflict:
    "Esta operación ya se registró con otros datos. Empezá una transferencia nueva.",
};

export type RecipientAccount = {
  id: string;
  firstName: string;
  lastName: string;
  alias: string | null;
  cvu: string | null;
};

export type RecipientPreview = {
  fullName: string;
  alias: string | null;
  cvuMasked: string | null;
};

export type TransferReceipt = {
  id: string;
  /** Fixed 2-decimal string. */
  amount: string;
  currency: string;
  description: string | null;
  createdAt: Date;
  recipient: { fullName: string; alias: string | null };
  /** The debited card and its balance now (null only if the card was deleted since). */
  sourceCard: {
    id: string;
    brand: CardBrand;
    last4: string;
    balance: string;
  } | null;
  /** The sender's SENT movement, for the movement detail link. */
  movementId: string | null;
  /** That movement's reference, as printed on its receipt ("ENV-7Q4K-92XA"). */
  reference: string | null;
};

export function fullNameOf(user: {
  firstName: string;
  lastName: string;
}): string {
  return `${user.firstName} ${user.lastName}`;
}
