import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE_NAME,
  getSessionKey,
  verifySessionToken,
} from "@/features/auth/session/session-token";
import { ROUTES } from "@/shared/lib/routes";

/**
 * Optimistic route guard: only verifies the JWT signature/expiry from the cookie (no DB),
 * because it runs on every matched request, including prefetches. The authoritative check
 * lives in the data access layer (`requireUser`).
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isLoginPage = pathname === ROUTES.login;

  // Signed cookie whose user no longer exists (see LOGIN_EXPIRED_URL): drop it and show login.
  if (isLoginPage && searchParams.has("expired")) {
    const response = NextResponse.next();
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
    getSessionKey(),
  );

  if (isLoginPage) {
    return session
      ? NextResponse.redirect(new URL(ROUTES.home, request.url))
      : NextResponse.next();
  }

  if (!session) {
    const response = NextResponse.redirect(new URL(ROUTES.login, request.url));
    // Clear an expired or tampered cookie so the browser stops sending it.
    if (request.cookies.has(SESSION_COOKIE_NAME)) {
      response.cookies.delete(SESSION_COOKIE_NAME);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Private pages plus /login. API routes authenticate themselves and answer 401, not redirects.
  matcher: ["/", "/login", "/movimientos/:path*"],
};
