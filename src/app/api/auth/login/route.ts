import { NextResponse, type NextRequest } from "next/server";

import { LOGIN_MESSAGES } from "@/features/auth/domain/login-schema";
import { signIn } from "@/features/auth/sign-in";

/**
 * REST entry point for the same login use case as the Server Action (e.g. for API clients).
 * Body: `{ "email": string, "password": string, "remember"?: boolean }`.
 *
 * Requiring a JSON body blocks login CSRF: a cross-site HTML form cannot send
 * `application/json`, and `fetch` with that content type triggers a CORS preflight.
 */
export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json(
      { error: "unsupported_media_type" },
      { status: 415 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = await signIn(body);

  if (result.ok) {
    return NextResponse.json({ user: { id: result.userId } });
  }
  if (result.reason === "invalid_input") {
    return NextResponse.json(
      { error: "invalid_input", fieldErrors: result.fieldErrors },
      { status: 400 },
    );
  }
  return NextResponse.json(
    {
      error: "invalid_credentials",
      message: LOGIN_MESSAGES.invalidCredentials,
    },
    { status: 401 },
  );
}
