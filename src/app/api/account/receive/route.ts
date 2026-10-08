import { NextResponse } from "next/server";

import { prismaReceiveDetailsRepository } from "@/features/account/data/prisma-receive-details-repository";
import { getReceiveDetails } from "@/features/account/domain/account-identifiers";
import { getCurrentUser } from "@/features/auth/server/current-user";
import {
  API_MESSAGES,
  apiError,
  withApiErrorHandling,
} from "@/shared/lib/api-response";

/**
 * `GET /api/account/receive` → `{ data: { holderName, alias, cvu, cvuFormatted } }`: what
 * the Receive screen shows and shares. 401 without a session; 404 if the account has no
 * identifiers assigned yet.
 */
export const GET = withApiErrorHandling(async () => {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", API_MESSAGES.unauthorized);

  const details = await getReceiveDetails(
    prismaReceiveDetailsRepository,
    user.id,
  );
  if (!details) {
    return apiError(
      "NOT_FOUND",
      "Tu cuenta todavía no tiene alias ni CVU asignados",
    );
  }
  return NextResponse.json({ data: details });
});
