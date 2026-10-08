import "server-only";

import { CARD_REVEAL_POLICY } from "@/shared/lib/rate-limit";
import { consumeRateLimit } from "@/shared/server/rate-limit-store";

import { prismaCardDetailsRepository } from "../data/prisma-card-repository";
import { recordCardReveal } from "../data/prisma-card-reveal-log";
import { revealCardDetails, type CardDetails } from "../domain/card";
import { demoCvvSecret, deriveDemoCvv } from "./demo-cvv";

export type RevealCardDetailsResult =
  | { ok: true; details: CardDetails }
  | { ok: false; reason: "rate_limited"; retryAfterSeconds: number }
  | { ok: false; reason: "card_not_found" };

/**
 * Application service behind `GET /api/account/cards/:id/details`:
 * 1. counts the reveal against the user's budget (CARD_REVEAL_POLICY) before touching the
 *    card, so a refused request reads nothing (an unknown id counts too: probing ids is
 *    what the limit is for);
 * 2. reads the owner's card (another user's id is "not found");
 * 3. writes the audit row before returning the data: no reveal leaves without its row
 *    (if the write fails, the request fails).
 */
export async function revealCardDetailsForUser(
  userId: string,
  cardId: string,
  { clientIp }: { clientIp: string | null },
): Promise<RevealCardDetailsResult> {
  const budget = await consumeRateLimit(
    "card:reveal",
    userId,
    CARD_REVEAL_POLICY,
  );
  if (!budget.allowed) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: budget.retryAfterSeconds,
    };
  }

  const secret = demoCvvSecret();
  const details = await revealCardDetails(
    prismaCardDetailsRepository,
    userId,
    cardId,
    (id) => deriveDemoCvv(id, secret),
  );
  if (!details) return { ok: false, reason: "card_not_found" };

  await recordCardReveal({ userId, cardId: details.id, ip: clientIp });
  return { ok: true, details };
}
