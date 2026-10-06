import "server-only";

import { apiError, type ApiErrorCode } from "@/shared/lib/api-response";

import {
  TRANSFER_FAILURE_MESSAGE,
  type TransferFailureReason,
} from "../domain/transfer";

const API_CODE: Record<TransferFailureReason, ApiErrorCode> = {
  recipient_not_found: "RECIPIENT_NOT_FOUND",
  card_not_found: "CARD_NOT_FOUND",
  self_transfer: "SELF_TRANSFER",
  insufficient_funds: "INSUFFICIENT_FUNDS",
  currency_mismatch: "CURRENCY_MISMATCH",
  amount_over_limit: "AMOUNT_OVER_LIMIT",
  idempotency_conflict: "IDEMPOTENCY_KEY_REUSED",
};

/** A business refusal as the shared REST error envelope (stable code, Spanish message). */
export function transferFailureResponse(reason: TransferFailureReason) {
  return apiError(API_CODE[reason], TRANSFER_FAILURE_MESSAGE[reason]);
}
