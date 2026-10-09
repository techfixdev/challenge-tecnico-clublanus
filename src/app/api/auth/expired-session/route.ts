import { NextResponse } from "next/server";

import { getCurrentUser } from "@/features/auth/server/current-user";
import { SESSION_COOKIE_NAME } from "@/features/auth/server/session-token";
import { ROUTES } from "@/shared/lib/routes";

/** A redirect with a relative `Location`: the request URL may carry the listen address. */
function redirectTo(path: string): NextResponse {
  return new NextResponse(null, {
    status: 307,
    headers: { Location: path, "Cache-Control": "no-store" },
  });
}

/**
 * `GET /api/auth/expired-session`: where the proxy sends `/login?expired=1` when the
 * cookie's token is validly signed, so the server (the authority on the session row)
 * decides what that link means:
 * - the session is live → back home, cookie untouched. A third-party link to
 *   `/login?expired=1` therefore cannot sign anyone out;
 * - the session was revoked or expired, or its user is gone → the cookie is deleted here
 *   (a Route Handler may change cookies, a Server Component may not) and the visitor goes
 *   to plain `/login`, which with no cookie shows the form: no redirect loop;
 * - the database cannot answer → nothing is deleted (the session may well be live) and
 *   the visitor goes home, whose error state explains the outage.
 * Safe as a GET: the only side effect is dropping a cookie the server already rejects.
 */
export async function GET(): Promise<NextResponse> {
  let isLive: boolean;
  try {
    isLive = (await getCurrentUser()) !== null;
  } catch (error) {
    console.error("Could not check the session behind /login?expired=1", error);
    return redirectTo(ROUTES.home);
  }
  if (isLive) return redirectTo(ROUTES.home);

  const response = redirectTo(ROUTES.login);
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
