/**
 * The client's IP address, for rate limiting and the audit log.
 *
 * Trust assumption: the app runs behind a proxy that sets these headers itself. On Vercel,
 * `x-forwarded-for` is overwritten by the platform with the address that opened the
 * connection (a value the client sent is not passed through), and `x-real-ip` carries the
 * same address. Its first entry is therefore the client. Self-hosted without such a proxy,
 * a client could send any value: the per-IP limit would then be a soft limit only, and
 * the per-email limit (which does not depend on headers) still holds.
 *
 * Returns null when neither header is present (e.g. a test request): callers skip the
 * per-IP limit rather than putting every such request in one shared bucket.
 */
export function clientIpFrom(headers: Pick<Headers, "get">): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip")?.trim();
  // 45 characters fit the longest textual IPv6 address (IPv4-mapped); anything longer
  // is not an address.
  return ip && ip.length <= 45 ? ip : null;
}
