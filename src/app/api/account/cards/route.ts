import { NextResponse } from "next/server";

import { prismaCardRepository } from "@/features/account/data/prisma-card-repository";
import { getAccountCards } from "@/features/account/domain/card";
import { getCurrentUser } from "@/features/auth/server/current-user";
import {
  API_MESSAGES,
  apiError,
  withApiErrorHandling,
} from "@/shared/lib/api-response";

/** `GET /api/account/cards` → `{ data: Card[] }` (primary first, balances as decimal strings). */
export const GET = withApiErrorHandling(async () => {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", API_MESSAGES.unauthorized);

  const cards = await getAccountCards(prismaCardRepository, user.id);
  return NextResponse.json({ data: cards });
});
