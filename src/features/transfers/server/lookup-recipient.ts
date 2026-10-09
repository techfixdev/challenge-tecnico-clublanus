import "server-only";

import { RECIPIENT_LOOKUP_POLICY } from "@/shared/lib/rate-limit";
import { consumeRateLimit } from "@/shared/server/rate-limit-store";

import { prismaTransferRepository } from "../data/prisma-transfer-repository";
import { previewRecipient } from "../domain/transfer";

export type RecipientLookupResult =
  | Awaited<ReturnType<typeof previewRecipient>>
  | { ok: false; reason: "rate_limited"; retryAfterSeconds: number };

/**
 * Server entry point shared by `GET /api/transfers/recipient` and the `lookupRecipient`
 * Server Action: counts the lookup against the user's budget (RECIPIENT_LOOKUP_POLICY)
 * before reading any account, so a refused request learns nothing. Every lookup counts,
 * found or not: guessing aliases is exactly what the limit is for.
 */
export async function lookupRecipientAs(
  userId: string,
  query: string | null,
): Promise<RecipientLookupResult> {
  const budget = await consumeRateLimit(
    "transfer:recipient-lookup",
    userId,
    RECIPIENT_LOOKUP_POLICY,
  );
  if (!budget.allowed) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: budget.retryAfterSeconds,
    };
  }
  return previewRecipient(prismaTransferRepository, userId, query);
}
