import { NextResponse, type NextRequest } from "next/server";

import { signOut } from "@/features/auth/server/sign-in";
import { apiError, withApiErrorHandling } from "@/shared/lib/api-response";
import { isCrossOriginRequest } from "@/shared/lib/same-origin";

/**
 * REST counterpart of the logout Server Action. Rejects cross-origin browser requests
 * (Origin header present and different) so other sites cannot log the user out.
 */
export const POST = withApiErrorHandling(async (request: NextRequest) => {
  if (isCrossOriginRequest(request)) {
    return apiError("FORBIDDEN", "Origen no permitido");
  }

  await signOut();
  return new NextResponse(null, { status: 204 });
});
