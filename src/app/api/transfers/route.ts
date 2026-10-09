import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/features/auth/server/current-user";
import { sendTransferAs } from "@/features/transfers/server/send-transfer";
import { transferFailureResponse } from "@/features/transfers/server/transfer-api-errors";
import {
  API_MESSAGES,
  apiError,
  isJsonContentType,
  rateLimitedError,
  withApiErrorHandling,
} from "@/shared/lib/api-response";
import { isCrossOriginRequest } from "@/shared/lib/same-origin";

/**
 * `POST /api/transfers` — send money to another GranaBank user.
 * Body: `{ recipient: alias | CVU, amount: "30.50", description?, cardId?, idempotencyKey: uuid }`.
 * 201 → `{ data: TransferReceipt & { replayed: false } }` (includes the debited card's new
 * balance); 200 with `replayed: true` when the idempotency key was already used for this
 * same transfer (the money moved once). Errors: 400, 401, 403, 404, 409, 415, 422, 429, 503.
 *
 * At most 10 attempts per user every 10 minutes (TRANSFER_SEND_POLICY; a replay is not
 * charged): the 11th answers 429 `RATE_LIMITED` with `Retry-After` before any money moves.
 *
 * CSRF: a JSON body is required (a cross-site form cannot send it) and a foreign `Origin`
 * is refused, as for logout.
 */
export const POST = withApiErrorHandling(async (request: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", API_MESSAGES.unauthorized);

  if (isCrossOriginRequest(request)) {
    return apiError("FORBIDDEN", "Origen no permitido");
  }
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return apiError(
      "UNSUPPORTED_MEDIA_TYPE",
      "El cuerpo debe enviarse como application/json",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "El cuerpo no es un JSON válido");
  }

  const result = await sendTransferAs(user.id, body);
  if (result.ok) {
    return NextResponse.json(
      { data: { ...result.receipt, replayed: result.replayed } },
      { status: result.replayed ? 200 : 201 },
    );
  }
  if (result.reason === "invalid_input") {
    return apiError("INVALID_INPUT", API_MESSAGES.invalidInput, result.details);
  }
  if (result.reason === "rate_limited") {
    return rateLimitedError(result.retryAfterSeconds);
  }
  return transferFailureResponse(result.reason);
});
