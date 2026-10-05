import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/features/auth/session/current-user";
import { prismaMovementRepository } from "@/features/movements/data/prisma-movement-repository";
import { toMovementDto } from "@/features/movements/domain/movement-dto";
import { getMovement } from "@/features/movements/domain/movement-queries";
import {
  API_MESSAGES,
  apiError,
  withApiErrorHandling,
} from "@/shared/lib/api-response";

/**
 * `GET /api/movements/:id` → `{ data: Movement }`.
 * Another user's id answers 404, exactly like an unknown one: the API never confirms
 * that an id exists outside the caller's own data.
 */
export const GET = withApiErrorHandling(
  async (
    _request: NextRequest,
    context: RouteContext<"/api/movements/[id]">,
  ) => {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", API_MESSAGES.unauthorized);

    const { id } = await context.params;
    const movement = await getMovement(prismaMovementRepository, user.id, id);
    if (!movement) {
      return apiError("NOT_FOUND", "No encontramos ese movimiento");
    }
    return NextResponse.json({ data: toMovementDto(movement) });
  },
);
