import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

import { classifyDatabaseError } from "./db-errors";
import { tooManyAttemptsMessage } from "./rate-limit";
import type { ValidationDetails } from "./validation";

/**
 * Shared JSON error contract for every REST route handler:
 * `{ "error": { "code": "NOT_FOUND", "message": "…", "details"?: {…} } }`.
 * Clients branch on the stable `code`; `message` is human-readable (Spanish UI copy).
 */

const STATUS_BY_CODE = {
  INVALID_JSON: 400,
  INVALID_INPUT: 400,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RECIPIENT_NOT_FOUND: 404,
  CARD_NOT_FOUND: 404,
  // The idempotency key was already used for a different request.
  IDEMPOTENCY_KEY_REUSED: 409,
  UNSUPPORTED_MEDIA_TYPE: 415,
  // Well-formed requests the business rules refuse.
  SELF_TRANSFER: 422,
  INSUFFICIENT_FUNDS: 422,
  CURRENCY_MISMATCH: 422,
  AMOUNT_OVER_LIMIT: 422,
  // Too many requests in the current window; the response carries `Retry-After`.
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type ApiErrorCode = keyof typeof STATUS_BY_CODE;

export type ApiErrorBody = {
  error: { code: ApiErrorCode; message: string; details?: ValidationDetails };
};

export const API_MESSAGES = {
  unauthorized: "Necesitás iniciar sesión",
  invalidInput: "Los datos enviados no son válidos",
  serviceUnavailable:
    "El servicio no está disponible en este momento. Intentá de nuevo en unos minutos.",
  internalError: "Ocurrió un error inesperado. Intentá de nuevo más tarde.",
} as const;

export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: ValidationDetails,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: details ? { code, message, details } : { code, message } },
    { status: STATUS_BY_CODE[code] },
  );
}

/**
 * 429 `RATE_LIMITED`: "Demasiados intentos. Probá de nuevo en N minutos." with a
 * `Retry-After` header carrying the seconds until the refusing window ends.
 */
export function rateLimitedError(
  retryAfterSeconds: number,
): NextResponse<ApiErrorBody> {
  const response = apiError(
    "RATE_LIMITED",
    tooManyAttemptsMessage(retryAfterSeconds),
  );
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

/**
 * Exact media-type check: `application/json`, optionally followed by parameters such as
 * `; charset=utf-8`. A substring check would also accept e.g. `text/plain; x=application/json`.
 */
export function isJsonContentType(header: string | null): boolean {
  const mediaType = header?.split(";")[0]?.trim().toLowerCase();
  return mediaType === "application/json";
}

/**
 * Wraps a route handler so an unexpected failure still answers with the shared shape and
 * never leaks internals:
 * - Next.js control flow (`redirect()`, `notFound()`) is rethrown for the framework to handle;
 * - an unreachable database is a transient outage: 503, the client may retry later;
 * - a database that rejects our configuration (credentials, database name) needs a fix,
 *   not a retry: 500, logged as such so it is easy to spot;
 * - anything else is a bug: 500, logged for the server logs.
 */
export function withApiErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      unstable_rethrow(error);
      switch (classifyDatabaseError(error)) {
        case "unavailable":
          console.error("Database unavailable in API route handler", error);
          return apiError(
            "SERVICE_UNAVAILABLE",
            API_MESSAGES.serviceUnavailable,
          );
        case "misconfigured":
          console.error(
            "Database rejected the configuration (check DATABASE_URL) in API route handler",
            error,
          );
          return apiError("INTERNAL_ERROR", API_MESSAGES.internalError);
        case "unclassified":
          console.error("Unhandled error in API route handler", error);
          return apiError("INTERNAL_ERROR", API_MESSAGES.internalError);
      }
    }
  };
}
