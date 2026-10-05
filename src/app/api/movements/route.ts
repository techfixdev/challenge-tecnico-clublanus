import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/features/auth/session/current-user";
import { prismaMovementRepository } from "@/features/movements/data/prisma-movement-repository";
import { toMovementDto } from "@/features/movements/domain/movement-dto";
import { parseMovementListParams } from "@/features/movements/domain/movement-filters";
import { listMovements } from "@/features/movements/domain/movement-queries";
import {
  API_MESSAGES,
  apiError,
  withApiErrorHandling,
} from "@/shared/lib/api-response";

/**
 * `GET /api/movements?q=&type=debito|recibido|enviado&cursor=`
 * → `{ data: Movement[], total: number, nextCursor: string | null }`.
 * Thin adapter over the same use case the movements page uses.
 */
export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", API_MESSAGES.unauthorized);

  const params = parseMovementListParams(request.nextUrl.searchParams);
  if (!params.success) {
    return apiError("INVALID_INPUT", API_MESSAGES.invalidInput, {
      fieldErrors: params.fieldErrors,
      formErrors: [],
    });
  }

  const page = await listMovements(
    prismaMovementRepository,
    user.id,
    params.data,
  );
  return NextResponse.json({
    data: page.items.map(toMovementDto),
    total: page.total,
    nextCursor: page.nextCursor,
  });
});
