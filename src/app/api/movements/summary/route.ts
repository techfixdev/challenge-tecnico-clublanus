import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/features/auth/server/current-user";
import { prismaMovementRepository } from "@/features/movements/data/prisma-movement-repository";
import {
  getMonthlySummary,
  parseSummaryMonth,
} from "@/features/movements/domain/movement-summary";
import {
  API_MESSAGES,
  apiError,
  withApiErrorHandling,
} from "@/shared/lib/api-response";

/**
 * `GET /api/movements/summary?month=YYYY-MM` (default: the current month in Buenos Aires)
 * → `{ data: { month, currency, income, expenses } }`, amounts as decimal strings.
 * Completed movements only; search and type filters do not apply (it is the month's summary).
 */
export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", API_MESSAGES.unauthorized);

  const params = parseSummaryMonth(request.nextUrl.searchParams.get("month"));
  if (!params.success) {
    return apiError("INVALID_INPUT", API_MESSAGES.invalidInput, {
      fieldErrors: params.fieldErrors,
      formErrors: [],
    });
  }

  const summary = await getMonthlySummary(prismaMovementRepository, user.id, {
    month: params.month,
  });
  return NextResponse.json({ data: summary });
});
