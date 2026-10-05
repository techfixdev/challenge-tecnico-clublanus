import { NextResponse, type NextRequest } from "next/server";

import { signOut } from "@/features/auth/sign-in";

/**
 * REST counterpart of the logout Server Action. Rejects cross-origin browser requests
 * (Origin header present and different) so other sites cannot log the user out.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await signOut();
  return new NextResponse(null, { status: 204 });
}
