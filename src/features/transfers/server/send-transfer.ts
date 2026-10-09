import "server-only";

import { TRANSFER_SEND_POLICY } from "@/shared/lib/rate-limit";
import {
  consumeRateLimit,
  refundRateLimit,
} from "@/shared/server/rate-limit-store";

import { prismaTransferRepository } from "../data/prisma-transfer-repository";
import { sendTransfer, type TransferResult } from "../domain/transfer";
import { revalidateAfterTransfer } from "./revalidate";

const SEND_SCOPE = "transfer:send";

export type SendTransferAsResult =
  | TransferResult
  | { ok: false; reason: "rate_limited"; retryAfterSeconds: number };

/**
 * Server entry point shared by `POST /api/transfers` and the send Server Action:
 * 1. counts the attempt against the user's budget (TRANSFER_SEND_POLICY) before the
 *    transaction, so a refused request moves nothing and locks nothing;
 * 2. runs the use case and, only when money actually moved, invalidates what shows balances;
 * 3. refunds the hit when the answer was an idempotent replay: retrying the same attempt
 *    (double submit, lost response) never spends the budget twice. A replay that arrives
 *    once the budget is already spent is refused like any attempt; retried after the
 *    window, it still replays the original transfer (the money moved once).
 * The caller resolves the session (`getCurrentUser` / `requireUser`) and passes its id.
 */
export async function sendTransferAs(
  senderId: string,
  input: unknown,
): Promise<SendTransferAsResult> {
  const budget = await consumeRateLimit(
    SEND_SCOPE,
    senderId,
    TRANSFER_SEND_POLICY,
  );
  if (!budget.allowed) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: budget.retryAfterSeconds,
    };
  }

  const result = await sendTransfer(prismaTransferRepository, senderId, input);
  if (result.ok && !result.replayed) revalidateAfterTransfer();
  if (result.ok && result.replayed) {
    // Bookkeeping only: the replay already succeeded, so a failed refund must not turn
    // it into an error (the hit just stays counted until the window ends).
    await refundRateLimit(SEND_SCOPE, senderId, budget.windowStart).catch(
      (error: unknown) => {
        console.error("Could not refund a replayed transfer's budget", error);
      },
    );
  }
  return result;
}
