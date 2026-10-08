// The only cross-feature dependency: a movement is paid with an account card, so it reuses
// the account domain's brand type (domain to domain; no UI or data coupling).
import type { CardBrand } from "@/features/account/domain/card";

/**
 * Movement entity as the app sees it. Framework-free: no Prisma types leak past the
 * repository, and money is a fixed 2-decimal string (Decimal serialized, never a float).
 */

/** Same values as the Prisma enum; the database validates them too. */
export const MOVEMENT_TYPES = ["SUBSCRIPTION", "RECEIVED", "SENT"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_STATUSES = ["COMPLETED", "PENDING"] as const;
export type MovementStatus = (typeof MOVEMENT_STATUSES)[number];

export type MovementCard = { brand: CardBrand; last4: string };

export type Movement = {
  id: string;
  counterparty: string;
  description: string;
  type: MovementType;
  status: MovementStatus;
  amount: string;
  currency: string;
  reference: string;
  occurredAt: Date;
  card: MovementCard | null;
  /**
   * For a transfer the user sent: the alias of the account it went to, so the detail can
   * offer to send again. Only the detail lookup reads it (null when unknown: a seeded
   * movement with no transfer behind it, or an account without an alias); lists leave it out.
   */
  recipientAlias?: string | null;
};
