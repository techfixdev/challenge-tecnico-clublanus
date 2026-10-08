/**
 * CSRF guard for the REST mutations, with the same rule Next applies to Server Actions:
 * the host in the `Origin` header must match the app's own host, taken from
 * `x-forwarded-host` (the public host behind a proxy such as Vercel) or `host`
 * (node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md).
 *
 * The request URL is not used: it reflects the address the server listens on (e.g.
 * `0.0.0.0` with `next dev -H 0.0.0.0`), not the host the browser called.
 * A request without `Origin` (curl, server-to-server) is not a browser CSRF and passes.
 */
export function isCrossOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const appHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host !== appHost;
  } catch {
    // "null" (sandboxed iframes, some redirects) or garbage: not our page.
    return true;
  }
}
