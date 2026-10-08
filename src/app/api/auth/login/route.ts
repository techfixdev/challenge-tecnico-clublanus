import { NextResponse, type NextRequest } from "next/server";

import { LOGIN_MESSAGES } from "@/features/auth/domain/login-schema";
import { signIn } from "@/features/auth/server/sign-in";
import {
  API_MESSAGES,
  apiError,
  isJsonContentType,
  withApiErrorHandling,
} from "@/shared/lib/api-response";
import { tooManyAttemptsMessage } from "@/shared/lib/rate-limit";
import { clientIpFrom } from "@/shared/server/client-ip";

/**
 * REST entry point for the same login use case as the Server Action (e.g. for API clients).
 * Body: `{ "email": string, "password": string, "remember"?: boolean }`.
 * 200 → `{ "data": { "userId": string } }` plus the session cookie; errors use the shared
 * `{ "error": { code, message, details? } }` envelope (400, 401, 415, 429, 500, 503).
 * Rate limited like the form (every 15 minutes: 5 failed attempts per email from one
 * client IP, 50 per email, 20 per client IP): past a limit it answers 429 `RATE_LIMITED`
 * with `Retry-After` (seconds).
 *
 * Requiring a JSON body blocks login CSRF: a cross-site HTML form cannot send
 * `application/json`, and `fetch` with that content type triggers a CORS preflight.
 */
export const POST = withApiErrorHandling(async (request: NextRequest) => {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return apiError(
      "UNSUPPORTED_MEDIA_TYPE",
      "El cuerpo debe enviarse como application/json",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "El cuerpo no es un JSON válido");
  }

  const result = await signIn(body, {
    clientIp: clientIpFrom(request.headers),
  });

  if (result.ok) {
    return NextResponse.json({ data: { userId: result.userId } });
  }
  if (result.reason === "invalid_input") {
    return apiError("INVALID_INPUT", API_MESSAGES.invalidInput, result.details);
  }
  if (result.reason === "rate_limited") {
    const response = apiError(
      "RATE_LIMITED",
      tooManyAttemptsMessage(result.retryAfterSeconds),
    );
    response.headers.set("Retry-After", String(result.retryAfterSeconds));
    return response;
  }
  return apiError("INVALID_CREDENTIALS", LOGIN_MESSAGES.invalidCredentials);
});
