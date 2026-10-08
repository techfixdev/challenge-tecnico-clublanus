import { Prisma } from "@/generated/prisma/client";

/**
 * What a database failure means for the caller:
 * - `unavailable`: the server could not be reached or timed out. Transient: retrying later
 *   can work, so the API answers 503.
 * - `misconfigured`: the server answered and rejected the configuration (credentials,
 *   database name, TLS). Retrying cannot help; it needs a fix, so the API answers 500.
 * - `unclassified`: anything else (a bug, bad data, an error Prisma itself cannot classify).
 *   Treated as a bug: 500.
 */
export type DatabaseErrorKind =
  "unavailable" | "misconfigured" | "unclassified";

/*
 * Identifiers observed with Prisma 7.10 + the pg driver adapter against PostgreSQL 17:
 * - wrong user/password → P1000 (model query) or P2010 (raw query), adapter kind
 *   `AuthenticationFailed`, SQLSTATE `28P01`;
 * - missing database → P1003 / P2010, kind `DatabaseDoesNotExist`, SQLSTATE `3D000`;
 * - closed port → the socket code itself (`ECONNREFUSED`) as the Prisma code;
 * - unknown host → P1001 / P2010, kind `DatabaseNotReachable`;
 * - pg-pool connect timeout → a plain `Error` with no code (matched by message below).
 * Prisma codes, SQLSTATEs, socket codes and adapter kinds never collide, so one set each.
 */

const MISCONFIGURED = new Set([
  "P1000", // authentication failed
  "P1003", // database does not exist
  "P1010", // access denied
  "28P01", // invalid_password
  "28000", // invalid_authorization_specification
  "3D000", // invalid_catalog_name
  "AuthenticationFailed",
  "DatabaseAccessDenied",
  "DatabaseDoesNotExist",
  "TlsConnectionError", // certificate or sslmode problem
]);

const UNAVAILABLE = new Set([
  "P1001", // can't reach the database server
  "P1002", // the server was reached but timed out
  "P1008", // operation timed out
  "P1017", // the server closed the connection
  "P2024", // timed out fetching a connection from the pool
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ConnectionClosed",
  "DatabaseNotReachable",
  "SocketTimeout",
  "TooManyConnections", // the server is saturated; capacity frees up
]);

/** pg-pool throws these without a `code`. */
const POOL_TIMEOUT_MESSAGES = new Set([
  "Connection terminated due to connection timeout",
  "timeout exceeded when trying to connect",
]);

function property(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null
    ? Reflect.get(value, key)
    : undefined;
}

function stringProperty(value: unknown, key: string): string | undefined {
  const found = property(value, key);
  return typeof found === "string" ? found : undefined;
}

/** Every identifier the error carries: Prisma code, socket code, adapter kind, SQLSTATE. */
function errorIdentifiers(error: unknown): string[] {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const cause = property(error.meta?.driverAdapterError, "cause");
    return [
      error.code,
      stringProperty(cause, "kind"),
      stringProperty(cause, "originalCode"),
    ].filter((id) => id !== undefined);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return error.errorCode ? [error.errorCode] : [];
  }
  // Prisma's unknown errors are deliberately left unclassified, whatever they carry.
  if (error instanceof Prisma.PrismaClientUnknownRequestError) return [];
  // A driver or socket error that reached us without Prisma wrapping it.
  const code =
    error instanceof Error ? stringProperty(error, "code") : undefined;
  return code ? [code] : [];
}

export function classifyDatabaseError(error: unknown): DatabaseErrorKind {
  const ids = errorIdentifiers(error);
  // Configuration first: a rejected login is not an outage even if it also looks like one.
  if (ids.some((id) => MISCONFIGURED.has(id))) return "misconfigured";
  if (ids.some((id) => UNAVAILABLE.has(id))) return "unavailable";
  if (error instanceof Error && POOL_TIMEOUT_MESSAGES.has(error.message)) {
    return "unavailable";
  }
  return "unclassified";
}
