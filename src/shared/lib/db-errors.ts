import { Prisma } from "@/generated/prisma/client";

/**
 * Tells "the database is unreachable right now" (a transient outage: retrying later can
 * work, so the API answers 503) apart from every other failure (a bug or bad data: 500).
 *
 * The codes come from observing Prisma 7 with the pg driver adapter: a refused connection
 * surfaces as a known request error whose `code` is the socket code (`ECONNREFUSED`), and
 * raw queries wrap any driver failure as `P2010` with the adapter's error `kind` in `meta`.
 */

const UNAVAILABLE_PRISMA_CODES = new Set([
  "P1000", // authentication failed
  "P1001", // can't reach the database server
  "P1002", // the server was reached but timed out
  "P1008", // operation timed out
  "P1017", // the server closed the connection
  "P2024", // timed out fetching a connection from the pool
]);

const UNAVAILABLE_SOCKET_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

const UNAVAILABLE_ADAPTER_KINDS = new Set([
  "AuthenticationFailed",
  "ConnectionClosed",
  "DatabaseDoesNotExist",
  "DatabaseNotReachable",
  "SocketTimeout",
  "TlsConnectionError",
  "TooManyConnections",
]);

function driverAdapterErrorKind(
  error: Prisma.PrismaClientKnownRequestError,
): unknown {
  const adapterError = error.meta?.driverAdapterError;
  if (typeof adapterError !== "object" || adapterError === null) return;
  const cause: unknown = Reflect.get(adapterError, "cause");
  return typeof cause === "object" && cause !== null
    ? Reflect.get(cause, "kind")
    : undefined;
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const kind = driverAdapterErrorKind(error);
    return (
      UNAVAILABLE_PRISMA_CODES.has(error.code) ||
      UNAVAILABLE_SOCKET_CODES.has(error.code) ||
      (typeof kind === "string" && UNAVAILABLE_ADAPTER_KINDS.has(kind))
    );
  }

  // A socket error that reached us without Prisma wrapping it.
  const code: unknown =
    error instanceof Error ? Reflect.get(error, "code") : undefined;
  return typeof code === "string" && UNAVAILABLE_SOCKET_CODES.has(code);
}
