import { NextResponse, type NextRequest } from "next/server";

import { LOGIN_MESSAGES } from "@/features/auth/domain/login-schema";
import { signIn } from "@/features/auth/sign-in";
import {
  API_MESSAGES,
  apiError,
  isJsonContentType,
  withApiErrorHandling,
} from "@/shared/lib/api-response";

/**
 * REST entry point for the same login use case as the Server Action (e.g. for API clients).
 * Body: `{ "email": string, "password": string, "remember"?: boolean }`.
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

  const result = await signIn(body);

  if (result.ok) {
    return NextResponse.json({ user: { id: result.userId } });
  }
  if (result.reason === "invalid_input") {
    return apiError("INVALID_INPUT", API_MESSAGES.invalidInput, result.details);
  }
  return apiError("INVALID_CREDENTIALS", LOGIN_MESSAGES.invalidCredentials);
});
