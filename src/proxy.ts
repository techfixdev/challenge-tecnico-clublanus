import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE_NAME,
  getSessionKey,
  verifySessionToken,
  type SessionPayload,
} from "@/features/auth/server/session-token";
import { isLanPreviewEnabled } from "@/shared/config/lan-preview";
import { LOGIN_EXPIRED_PARAM, ROUTES } from "@/shared/lib/routes";
import {
  buildContentSecurityPolicy,
  generateNonce,
} from "@/shared/security/headers";

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

/** Pages that need a session; everything else the proxy matches only gets the CSP. */
const PRIVATE_PATHS = [
  ROUTES.movements,
  ROUTES.transfer,
  ROUTES.receive,
] as const;

function isPrivatePage(pathname: string): boolean {
  return (
    pathname === ROUTES.home ||
    PRIVATE_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  );
}

/**
 * Content-Security-Policy with a fresh nonce (Next.js CSP guide): set on the request, so
 * Next.js reads the nonce while rendering and attaches it to its own scripts, and on every
 * response (redirects included), so the browser enforces it. Pages must render per request
 * for that to work: the root layout opts every page into dynamic rendering.
 */
function securedResponses(request: NextRequest) {
  const policy = buildContentSecurityPolicy({
    nonce: generateNonce(),
    isDevelopment: process.env.NODE_ENV === "development",
    isLanPreview: isLanPreviewEnabled(),
    host: request.nextUrl.host,
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);

  function secure(response: NextResponse): NextResponse {
    response.headers.set("Content-Security-Policy", policy);
    return response;
  }
  return {
    next: () =>
      secure(NextResponse.next({ request: { headers: requestHeaders } })),
    redirect: (path: string) =>
      secure(NextResponse.redirect(new URL(path, request.url))),
  };
}

/**
 * Optimistic route guard: only verifies the JWT signature/expiry from the cookie (no DB),
 * because it runs on every matched request, including prefetches (Next.js auth guide:
 * "avoid database checks" in Proxy). Whether the session is still live (not revoked by
 * logout) is decided by the server, in the data access layer (`requireUser`).
 * It also sends the Content-Security-Policy of every page (see `securedResponses`).
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isLoginPage = pathname === ROUTES.login;
  const respond = securedResponses(request);

  if (!isLoginPage && !isPrivatePage(pathname)) return respond.next();

  // Signed cookie the server no longer honours (see LOGIN_EXPIRED_PARAM): drop it, show login.
  if (isLoginPage && searchParams.has(LOGIN_EXPIRED_PARAM)) {
    const response = respond.next();
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  const session = await readSessionSafely(request);

  if (isLoginPage) {
    return session ? respond.redirect(ROUTES.home) : respond.next();
  }

  if (!session) {
    const response = respond.redirect(ROUTES.login);
    // Clear an expired or tampered cookie so the browser stops sending it.
    if (request.cookies.has(SESSION_COOKIE_NAME)) {
      response.cookies.delete(SESSION_COOKIE_NAME);
    }
    return response;
  }

  return respond.next();
}

export const config = {
  matcher: [
    // Private pages plus /login, prefetches included: the session check runs on them too.
    // API routes authenticate themselves and answer 401, not redirects.
    "/",
    "/login",
    "/movimientos/:path*",
    "/transferir/:path*",
    "/recibir/:path*",
    // Every other page (not-found included) for the CSP, skipping what renders no HTML:
    // API routes, build assets, the icons, and prefetches (Next.js CSP guide).
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
