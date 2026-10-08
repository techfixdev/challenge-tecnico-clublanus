/**
 * Query param that marks a login visit caused by a signed session the server no longer
 * honours (revoked by logout, expired, or its user is gone, e.g. the database was reset).
 * `requireUser()` redirects there and `proxy.ts` clears the
 * cookie for it; a plain redirect to /login would bounce back to / because the proxy only
 * checks the token signature.
 */
export const LOGIN_EXPIRED_PARAM = "expired";

/** App routes (Spanish paths, matching the UI language). */
export const ROUTES = {
  home: "/",
  login: "/login",
  loginExpired: `/login?${LOGIN_EXPIRED_PARAM}=1`,
  movements: "/movimientos",
  movement: (id: string) => `/movimientos/${encodeURIComponent(id)}`,
  transfer: "/transferir",
  receive: "/recibir",
} as const;
