// Cross-feature dependency, domain to domain only: a transfer debits an account card and
// finds the recipient by the account identifiers (alias / CVU).
import { maskCvu } from "@/features/account/domain/account-identifiers";
import { toCents } from "@/shared/lib/money";
import type { ValidationDetails } from "@/shared/lib/validation";

import {
  parseRecipientQuery,
  parseTransferRequest,
  type RecipientKey,
  type TransferRequest,
} from "./transfer-schema";
import {
  fullNameOf,
  type RecipientAccount,
  type RecipientPreview,
  type TransferFailureReason,
  type TransferReceipt,
} from "./transfer-model";

/**
 * Transfers between GranaBank users. Framework-free: the rules live here; the Prisma
 * repository runs them inside one database transaction and makes the writes atomic.
 *
 * Business outcomes are values (a discriminated union), never exceptions: an exception
 * means something broke (database down, a bug), not that the user lacks funds.
 */

export {
  TRANSFER_FAILURE_MESSAGE,
  fullNameOf,
  type RecipientAccount,
  type RecipientPreview,
  type TransferFailureReason,
  type TransferReceipt,
} from "./transfer-model";

export type TransferOutcome =
  | {
      ok: true;
      receipt: TransferReceipt;
      /** True when the idempotency key had already been used for this same transfer. */
      replayed: boolean;
    }
  | { ok: false; reason: TransferFailureReason };

export type TransferResult =
  | TransferOutcome
  | { ok: false; reason: "invalid_input"; details: ValidationDetails };

export interface TransferRepository {
  findRecipient(key: RecipientKey): Promise<RecipientAccount | null>;
  /** Runs the whole transfer atomically (or replays it for a known idempotency key). */
  execute(senderId: string, request: TransferRequest): Promise<TransferOutcome>;
}

/** What the transaction has read, under lock, before deciding whether to move money. */
export type TransferState = {
  senderId: string;
  amountCents: number;
  recipient: {
    id: string;
    /** The recipient's primary card, which receives the money. */
    destinationCard: { id: string; currency: string } | null;
  } | null;
  /** The sender's chosen (or primary) card, scoped to the sender. */
  sourceCard: { id: string; currency: string; balance: string } | null;
};

/**
 * The transfer rules, in the order a user would want them reported: who (does the
 * recipient exist, is it someone else), then from where (card, currency), then how much.
 * The balance check here gives the friendly answer; the repository's conditional debit is
 * what actually guarantees no overdraft under concurrency.
 */
export function planTransfer(
  state: TransferState,
): { ok: true } | { ok: false; reason: TransferFailureReason } {
  const { recipient, sourceCard } = state;
  if (!recipient?.destinationCard) {
    return { ok: false, reason: "recipient_not_found" };
  }
  if (recipient.id === state.senderId) {
    return { ok: false, reason: "self_transfer" };
  }
  if (!sourceCard) return { ok: false, reason: "card_not_found" };
  if (sourceCard.currency !== recipient.destinationCard.currency) {
    return { ok: false, reason: "currency_mismatch" };
  }
  if (toCents(sourceCard.balance) < state.amountCents) {
    return { ok: false, reason: "insufficient_funds" };
  }
  return { ok: true };
}

/**
 * A replayed idempotency key must carry the same request. Otherwise the client reused a
 * key for a different transfer (a bug or a tampered retry): refuse rather than guess.
 */
export function isSameTransferRequest(
  stored: {
    recipientId: string;
    amount: string;
    description: string | null;
    sourceCardId: string | null;
  },
  request: {
    recipientId: string;
    amount: string;
    description?: string;
    cardId?: string;
  },
): boolean {
  return (
    stored.recipientId === request.recipientId &&
    stored.amount === request.amount &&
    stored.description === (request.description ?? null) &&
    // No card in the request means "the primary one": whichever it was, it matches.
    (request.cardId === undefined || stored.sourceCardId === request.cardId)
  );
}

/** Use case: send money. Shared by the REST route and the Server Action. */
export async function sendTransfer(
  repository: TransferRepository,
  senderId: string,
  input: unknown,
): Promise<TransferResult> {
  const parsed = parseTransferRequest(input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_input", details: parsed.details };
  }
  return repository.execute(senderId, parsed.data);
}

/** Use case: who would receive the money (the confirm step, before sending). */
export async function previewRecipient(
  repository: TransferRepository,
  senderId: string,
  query: string | null,
): Promise<
  | { ok: true; recipient: RecipientPreview }
  | { ok: false; reason: "recipient_not_found" | "self_transfer" }
  | { ok: false; reason: "invalid_input"; details: ValidationDetails }
> {
  const parsed = parseRecipientQuery(query);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_input", details: parsed.details };
  }
  const account = await repository.findRecipient(parsed.data);
  if (!account) return { ok: false, reason: "recipient_not_found" };
  if (account.id === senderId) return { ok: false, reason: "self_transfer" };
  return {
    ok: true,
    recipient: {
      fullName: fullNameOf(account),
      alias: account.alias,
      cvuMasked: account.cvu ? maskCvu(account.cvu) : null,
    },
  };
}
