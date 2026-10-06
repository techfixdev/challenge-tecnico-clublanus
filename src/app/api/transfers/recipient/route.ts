import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/features/auth/server/current-user";
import { prismaTransferRepository } from "@/features/transfers/data/prisma-transfer-repository";
import { previewRecipient } from "@/features/transfers/domain/transfer";
import { transferFailureResponse } from "@/features/transfers/server/transfer-api-errors";
import {
  API_MESSAGES,
  apiError,
  withApiErrorHandling,
} from "@/shared/lib/api-response";

/**
 * `GET /api/transfers/recipient?q=<alias|CVU>` → `{ data: { fullName, alias, cvuMasked } }`
 * for the confirm step. 400 (malformed), 401, 404 RECIPIENT_NOT_FOUND, 422 SELF_TRANSFER.
 * Only the last 4 CVU digits are returned: enough to confirm, not to harvest accounts.
 */
export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", API_MESSAGES.unauthorized);

  const result = await previewRecipient(
    prismaTransferRepository,
    user.id,
    request.nextUrl.searchParams.get("q"),
  );
  if (result.ok) return NextResponse.json({ data: result.recipient });
  if (result.reason === "invalid_input") {
    return apiError("INVALID_INPUT", API_MESSAGES.invalidInput, result.details);
  }
  return transferFailureResponse(result.reason);
});
