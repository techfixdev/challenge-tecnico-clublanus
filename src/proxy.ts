import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE_NAME,
  getSessionKey,
  verifySessionToken,
  type SessionPayload,
} from "@/features/auth/session/session-token";
import { LOGIN_EXPIRED_PARAM, ROUTES } from "@/shared/lib/routes";

let hasLoggedMissingSecret = false;

/**
 * Fail safe: a missing or short SESSION_SECRET must not crash every request. Treat the
 * visitor as signed out (they land on /login, where the login action reports the problem)
 * and log the misconfiguration once per server instance instead of on every request.
 */
async function readSessionSafely(
  request: NextRequest,
): Promise<SessionPayload | null> {
  let key: Uint8Array;
  try {
    key = getSessionKey();
  } catch (error) {
    if (!hasLoggedMissingSecret) {
      hasLoggedMissingSecret = true;
      console.error(
        "Session key unavailable; treating requests as signed out.",
        error,
      );
    }
    return null;
  }
  return verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
    key,
  );
}

/**
 * Optimistic route guard: only verifies the JWT signature/expiry from the cookie (no DB),
 * because it runs on every matched request, including prefetches. The authoritative check
 * lives in the data access layer (`requireUser`).
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isLoginPage = pathname === ROUTES.login;

  // Signed cookie whose user no longer exists (see LOGIN_EXPIRED_PARAM): drop it, show login.
  if (isLoginPage && searchParams.has(LOGIN_EXPIRED_PARAM)) {
    const response = NextResponse.next();
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  const session = await readSessionSafely(request);

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
