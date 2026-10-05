import { NextResponse } from "next/server";

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
  UNSUPPORTED_MEDIA_TYPE: 415,
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
 * Exact media-type check: `application/json`, optionally followed by parameters such as
 * `; charset=utf-8`. A substring check would also accept e.g. `text/plain; x=application/json`.
 */
export function isJsonContentType(header: string | null): boolean {
  const mediaType = header?.split(";")[0]?.trim().toLowerCase();
  return mediaType === "application/json";
}

/**
 * Wraps a route handler so an unexpected failure (typically infrastructure: database down,
 * missing configuration) becomes a logged 503 with the shared shape, instead of an
 * unformatted 500 that could leak internals.
 */
export function withApiErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("Unhandled error in API route handler", error);
      return apiError("SERVICE_UNAVAILABLE", API_MESSAGES.serviceUnavailable);
    }
  };
}
