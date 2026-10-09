import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/features/auth/server/current-user";
import { lookupRecipientAs } from "@/features/transfers/server/lookup-recipient";
import { transferFailureResponse } from "@/features/transfers/server/transfer-api-errors";
import {
  API_MESSAGES,
  apiError,
  rateLimitedError,
  withApiErrorHandling,
} from "@/shared/lib/api-response";

/**
 * `GET /api/transfers/recipient?q=<alias|CVU>` → `{ data: { fullName, alias, cvuMasked } }`
 * for the confirm step. 400 (malformed), 401, 404 RECIPIENT_NOT_FOUND, 422 SELF_TRANSFER, 429 RATE_LIMITED.
 * Only the last 4 CVU digits are returned: enough to confirm, not to harvest accounts.
 * At most 30 lookups per user every 10 minutes (RECIPIENT_LOOKUP_POLICY): the 31st
 * answers 429 `RATE_LIMITED` with `Retry-After`, before any account is read.
 */
export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", API_MESSAGES.unauthorized);

  const result = await lookupRecipientAs(
    user.id,
    request.nextUrl.searchParams.get("q"),
  );
  if (result.ok) return NextResponse.json({ data: result.recipient });
  if (result.reason === "invalid_input") {
    return apiError("INVALID_INPUT", API_MESSAGES.invalidInput, result.details);
  }
  if (result.reason === "rate_limited") {
    return rateLimitedError(result.retryAfterSeconds);
  }
  return transferFailureResponse(result.reason);
});
