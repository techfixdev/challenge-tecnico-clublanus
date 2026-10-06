import {
  maskCvu,
  normalizeCvu,
} from "@/features/account/domain/account-identifiers";
import { parseAmount, toCents } from "@/shared/lib/money";
import type { ValidationDetails } from "@/shared/lib/validation";

import {
  TRANSFER_FAILURE_MESSAGE,
  fullNameOf,
  type RecipientAccount,
  type RecipientPreview,
  type TransferFailureReason,
  type TransferReceipt,
} from "./transfer";
import { parseRecipientQuery, parseTransferAmount } from "./transfer-schema";

/**
 * The send flow as the UI sees it: steps, the Server Actions' results and the instant
 * checks the form runs while typing. Every check reuses the server's schema, so the form
 * and the server can never disagree on what is valid.
 */

export type TransferStep = "recipient" | "amount" | "review";

/** A recipient the sender has confirmed, plus the text that identifies it to the server. */
export type ConfirmedRecipient = RecipientPreview & { query: string };

export type RecipientLookup =
  { ok: true; recipient: ConfirmedRecipient } | { ok: false; message: string };

export type SendTransferState =
  | { status: "idle" }
  | {
      status: "success";
      receipt: TransferReceipt;
      /** A fresh key for the next transfer (this one is spent). */
      nextIdempotencyKey: string;
    }
  | {
      status: "error";
      message: string;
      /** The step where the user can fix it. */
      step: TransferStep;
      /** Set when the key can no longer be used (a conflict): retry with this one. */
      nextIdempotencyKey?: string;
    };

export const INITIAL_SEND_TRANSFER_STATE: SendTransferState = {
  status: "idle",
};

export type SendTransferAction = (
  state: SendTransferState,
  formData: FormData,
) => Promise<SendTransferState>;

export type LookupRecipientAction = (query: string) => Promise<RecipientLookup>;

export const TRANSFER_FORM_MESSAGES = {
  unexpected:
    "No pudimos completar la transferencia. Probá de nuevo: no se te va a cobrar dos veces.",
  lookupUnexpected:
    "No pudimos buscar la cuenta. Probá de nuevo en unos segundos.",
  sessionExpired: "Tu sesión expiró. Ingresá de nuevo para continuar.",
} as const;

/** Instant feedback for the alias / CVU field: null when the text is well formed. */
export function recipientInputError(raw: string): string | null {
  const result = parseRecipientQuery(raw);
  return result.success ? null : (result.details.fieldErrors.q?.[0] ?? null);
}

const RECIPIENT_HINT = "Alias de 6 a 20 caracteres o CVU de 22 dígitos";

/** Help under the field; counts digits while a CVU is being typed. */
export function recipientInputHint(raw: string): string {
  const digits = normalizeCvu(raw.trim());
  return /^\d+$/.test(digits)
    ? `CVU: ${digits.length} de 22 dígitos`
    : RECIPIENT_HINT;
}

/**
 * Instant feedback for the amount: format and limits (the server's rules), then the
 * chosen card's balance, so an impossible transfer never reaches the confirm step.
 */
export function amountInputError(
  raw: string,
  availableBalance?: string,
): string | null {
  const parsed = parseTransferAmount(raw);
  if (!parsed.success) return parsed.message;
  if (
    availableBalance !== undefined &&
    parsed.cents > toCents(availableBalance)
  ) {
    return TRANSFER_FAILURE_MESSAGE.insufficient_funds;
  }
  return null;
}

/**
 * The amount as the app writes it, once the field is left: "12,3" → "12.30", like the
 * review and the receipt show it. A whole amount stays as typed ("12"), and so does text
 * the field flags as invalid, so the user can still see and fix what they wrote.
 */
export function normalizeAmountInput(raw: string): string {
  if (!/[.,]/.test(raw)) return raw;
  return parseAmount(raw)?.amount ?? raw;
}

const FAILURE_STEP: Record<TransferFailureReason, TransferStep> = {
  recipient_not_found: "recipient",
  self_transfer: "recipient",
  currency_mismatch: "recipient",
  insufficient_funds: "amount",
  card_not_found: "amount",
  idempotency_conflict: "review",
};

export function stepForFailure(reason: TransferFailureReason): TransferStep {
  return FAILURE_STEP[reason];
}

const FIELD_ORDER = ["recipient", "amount", "description", "cardId"];

function firstInvalidField(details: ValidationDetails): string | undefined {
  return [
    ...FIELD_ORDER,
    ...Object.keys(details.fieldErrors).filter(
      (key) => !FIELD_ORDER.includes(key),
    ),
  ].find((key) => details.fieldErrors[key]?.length);
}

/** The message to show for a server-side validation failure (fields in form order). */
export function firstErrorMessage(details: ValidationDetails): string | null {
  const field = firstInvalidField(details);
  return field
    ? details.fieldErrors[field][0]
    : (details.formErrors[0] ?? null);
}

/** Where a server-side validation failure can be fixed. */
export function stepForInvalidInput(details: ValidationDetails): TransferStep {
  const field = firstInvalidField(details);
  if (field === "recipient") return "recipient";
  if (field && field !== "idempotencyKey") return "amount";
  return "review";
}

/** One transfer as read for "recent recipients": both parties. */
export type TransferParties = {
  sender: RecipientAccount;
  recipient: RecipientAccount;
};

/**
 * People the user has exchanged money with (sent to or received from), newest first,
 * once each. Only accounts with an alias qualify: the alias is what the quick pick sends,
 * so no full CVU ever reaches the browser.
 */
export function pickRecentRecipients(
  transfers: readonly TransferParties[],
  userId: string,
  limit = 4,
): ConfirmedRecipient[] {
  const seen = new Set<string>();
  const recipients: ConfirmedRecipient[] = [];
  for (const { sender, recipient } of transfers) {
    const other = sender.id === userId ? recipient : sender;
    if (other.id === userId || !other.alias || seen.has(other.id)) continue;
    seen.add(other.id);
    recipients.push({
      fullName: fullNameOf(other),
      alias: other.alias,
      cvuMasked: other.cvu ? maskCvu(other.cvu) : null,
      query: other.alias,
    });
    if (recipients.length === limit) break;
  }
  return recipients;
}

export interface RecentTransfersRepository {
  /** The user's latest transfers, sent or received, newest first. */
  findRecentTransfers(userId: string, take: number): Promise<TransferParties[]>;
}

/** Use case: quick picks for the recipient step. */
export async function getRecentRecipients(
  repository: RecentTransfersRepository,
  userId: string,
): Promise<ConfirmedRecipient[]> {
  return pickRecentRecipients(
    await repository.findRecentTransfers(userId, 20),
    userId,
  );
}
