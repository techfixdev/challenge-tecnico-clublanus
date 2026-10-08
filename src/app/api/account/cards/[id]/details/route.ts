import { NextResponse, type NextRequest } from "next/server";

import { revealCardDetailsForUser } from "@/features/account/server/reveal-card-details";
import { getCurrentUser } from "@/features/auth/server/current-user";
import {
  API_MESSAGES,
  apiError,
  withApiErrorHandling,
} from "@/shared/lib/api-response";
import { tooManyAttemptsMessage } from "@/shared/lib/rate-limit";
import { clientIpFrom } from "@/shared/server/client-ip";

type Context = RouteContext<"/api/account/cards/[id]/details">;

const handle = withApiErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", API_MESSAGES.unauthorized);

    const { id } = await context.params;
    const result = await revealCardDetailsForUser(user.id, id, {
      clientIp: clientIpFrom(request.headers),
    });
    if (result.ok) return NextResponse.json({ data: result.details });

    if (result.reason === "rate_limited") {
      const response = apiError(
        "RATE_LIMITED",
        tooManyAttemptsMessage(result.retryAfterSeconds),
      );
      response.headers.set("Retry-After", String(result.retryAfterSeconds));
      return response;
    }
    return apiError("CARD_NOT_FOUND", "No encontramos esa tarjeta");
  },
);

/**
 * `GET /api/account/cards/:id/details` → `{ data: { id, number, cvv, balance, currency } }`.
 * The data a card keeps masked, fetched only when its owner taps the eye (`number` is
 * null for a card without a stored number; the balance and CVV are still returned):
 * - the session is re-verified here (the proxy check is only optimistic) and the card
 *   is looked up by owner, so another user's id answers 404 like an unknown one;
 * - at most 10 reveals per user every 10 minutes: the 11th answers 429 `RATE_LIMITED`
 *   with `Retry-After` (seconds), and every successful reveal is written to an audit log
 *   (see revealCardDetailsForUser);
 * - every answer is `Cache-Control: no-store`: neither the browser nor a proxy may keep
 *   a copy of a card number.
 */
export async function GET(request: NextRequest, context: Context) {
  const response = await handle(request, context);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
