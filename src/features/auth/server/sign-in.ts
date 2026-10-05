import "server-only";

import bcrypt from "bcryptjs";

import {
  validationDetails,
  type ValidationDetails,
} from "@/shared/lib/validation";

import { findCredentialsByEmail } from "../data/user-repository";
import { authenticate } from "../domain/authenticate";
import {
  getLoginFieldErrors,
  loginSchema,
  type LoginFieldErrors,
} from "../domain/login-schema";
import { createSession, deleteSession } from "./session";

export type SignInResult =
  | { ok: true; userId: string }
  | {
      ok: false;
      reason: "invalid_input";
      /** First message per form field, for the login form. */
      fieldErrors: LoginFieldErrors;
      /** Every issue (any field, or a non-object body), for API clients. */
      details: ValidationDetails;
    }
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
      details: validationDetails(parsed.error),
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
