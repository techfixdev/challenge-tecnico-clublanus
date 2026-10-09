import { NextResponse, type NextRequest } from "next/server";

import { revealCardDetailsForUser } from "@/features/account/server/reveal-card-details";
import { getCurrentUser } from "@/features/auth/server/current-user";
import {
  API_MESSAGES,
  apiError,
  rateLimitedError,
  withApiErrorHandling,
} from "@/shared/lib/api-response";
import { isCrossOriginRequest } from "@/shared/lib/same-origin";
import { clientIpFrom } from "@/shared/server/client-ip";

type Context = RouteContext<"/api/account/cards/[id]/details">;

const handle = withApiErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", API_MESSAGES.unauthorized);
    // Checked before the budget: another site's page cannot spend the user's reveals.
    if (isCrossOriginRequest(request)) {
      return apiError("FORBIDDEN", "Origen no permitido");
    }

    const { id } = await context.params;
    const result = await revealCardDetailsForUser(user.id, id, {
      clientIp: clientIpFrom(request.headers),
    });
    if (result.ok) return NextResponse.json({ data: result.details });

    if (result.reason === "rate_limited") {
      return rateLimitedError(result.retryAfterSeconds);
    }
    return apiError("CARD_NOT_FOUND", "No encontramos esa tarjeta");
  },
);

/**
 * `POST /api/account/cards/:id/details` → `{ data: { id, number, cvv, balance, currency } }`.
 * The data a card keeps masked, fetched only when its owner taps the eye (`number` is
 * null for a card without a stored number; the balance and CVV are still returned):
 * - the session is re-verified here (the proxy check is only optimistic) and the card
 *   is looked up by owner, so another user's id answers 404 like an unknown one;
 * - at most 10 reveals per user every 10 minutes: the 11th answers 429 `RATE_LIMITED`
 *   with `Retry-After` (seconds), and every successful reveal is written to an audit log
 *   (see revealCardDetailsForUser);
 * - every answer is `Cache-Control: no-store`: neither the browser nor a proxy may keep
 *   a copy of a card number.
 * POST, not GET: a reveal has side effects (it spends the budget and writes the audit
 * row), so it must not be a safe method a link, an `<img>` or a prefetch could trigger.
 * Like the other REST mutations, a foreign `Origin` answers 403 before anything is
 * counted; GET answers 405 (the route does not export it).
 */
export async function POST(request: NextRequest, context: Context) {
  const response = await handle(request, context);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
