import "server-only";

import bcrypt from "bcryptjs";

import { findCredentialsByEmail } from "./data/user-repository";
import { authenticate } from "./domain/authenticate";
import {
  getLoginFieldErrors,
  loginSchema,
  type LoginFieldErrors,
} from "./domain/login-schema";
import { createSession, deleteSession } from "./session/session";

export type SignInResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid_input"; fieldErrors: LoginFieldErrors }
  | { ok: false; reason: "invalid_credentials" };

/**
 * Application service shared by the login Server Action and the REST route handler:
 * validate input -> check credentials -> start a session.
 */
export async function signIn(input: unknown): Promise<SignInResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid_input",
      fieldErrors: getLoginFieldErrors(parsed.error),
    };
  }

  const { email, password, remember } = parsed.data;
  const result = await authenticate(
    { email, password },
    {
      findUserByEmail: findCredentialsByEmail,
      verifyPassword: bcrypt.compare,
    },
  );
  if (!result.ok) {
    return { ok: false, reason: "invalid_credentials" };
  }

  await createSession(result.userId, { remember });
  return { ok: true, userId: result.userId };
}

export async function signOut(): Promise<void> {
  await deleteSession();
}
