import { NextResponse, type NextRequest } from "next/server";

import { prismaCardDetailsRepository } from "@/features/account/data/prisma-card-repository";
import { revealCardDetails } from "@/features/account/domain/card";
import {
  demoCvvSecret,
  deriveDemoCvv,
} from "@/features/account/server/demo-cvv";
import { getCurrentUser } from "@/features/auth/server/current-user";
import {
  API_MESSAGES,
  apiError,
  withApiErrorHandling,
} from "@/shared/lib/api-response";

type Context = RouteContext<"/api/account/cards/[id]/details">;

const handle = withApiErrorHandling(
  async (_request: NextRequest, context: Context) => {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", API_MESSAGES.unauthorized);

    const { id } = await context.params;
    const secret = demoCvvSecret();
    const details = await revealCardDetails(
      prismaCardDetailsRepository,
      user.id,
      id,
      (cardId) => deriveDemoCvv(cardId, secret),
    );
    if (!details) {
      return apiError("CARD_NOT_FOUND", "No encontramos esa tarjeta");
    }
    return NextResponse.json({ data: details });
  },
);

/**
 * `GET /api/account/cards/:id/details` → `{ data: { id, number, cvv, balance, currency } }`.
 * The data a card keeps masked, fetched only when its owner taps the eye:
 * - the session is re-verified here (the proxy check is only optimistic) and the card
 *   is looked up by owner, so another user's id answers 404 like an unknown one;
 * - every answer is `Cache-Control: no-store`: neither the browser nor a proxy may keep
 *   a copy of a card number;
 * - one request per reveal, no polling; rate limiting belongs in front of it (README).
 */
export async function GET(request: NextRequest, context: Context) {
  const response = await handle(request, context);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
