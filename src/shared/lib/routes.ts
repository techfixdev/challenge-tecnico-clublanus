/**
 * Query param that marks a login visit caused by a signed session the server no longer
 * honours (revoked by logout, expired, or its user is gone, e.g. the database was reset).
 * `requireUser()` redirects there; a plain redirect to /login would bounce back to /
 * because the proxy only checks the token signature. On that URL `proxy.ts` drops a
 * cookie it cannot verify, and sends a validly signed one to `expiredSessionCheck`, where
 * the server deletes it only if its session is really dead (so a link to this URL cannot
 * sign a live session out).
 */
export const LOGIN_EXPIRED_PARAM = "expired";

/** App routes (Spanish paths, matching the UI language). */
export const ROUTES = {
  home: "/",
  login: "/login",
  loginExpired: `/login?${LOGIN_EXPIRED_PARAM}=1`,
  /** Route Handler that clears the cookie of a dead session (see LOGIN_EXPIRED_PARAM). */
  expiredSessionCheck: "/api/auth/expired-session",
  movements: "/movimientos",
  movement: (id: string) => `/movimientos/${encodeURIComponent(id)}`,
  transfer: "/transferir",
  receive: "/recibir",
} as const;
