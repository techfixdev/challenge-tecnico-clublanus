import "server-only";

import bcrypt from "bcryptjs";

import {
  LOGIN_EMAIL_POLICY,
  LOGIN_IP_POLICY,
  type RateLimitDecision,
} from "@/shared/lib/rate-limit";
import {
  validationDetails,
  type ValidationDetails,
} from "@/shared/lib/validation";
import {
  consumeRateLimit,
  refundRateLimit,
} from "@/shared/server/rate-limit-store";

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
  | { ok: false; reason: "invalid_credentials" }
  | { ok: false; reason: "rate_limited"; retryAfterSeconds: number };

export type SignInContext = {
  /** The caller's client IP (src/shared/server/client-ip.ts); null skips the per-IP limit. */
  clientIp: string | null;
};

/**
 * Takes one attempt from the client IP's budget, then (only if that passed) from the
 * email's. Each take is atomic in PostgreSQL, so parallel guesses cannot slip past the
 * limit. IP first: a client already blocked by IP cannot burn a victim's email budget.
 */
async function takeLoginAttempt(
  email: string,
  clientIp: string | null,
): Promise<RateLimitDecision> {
  if (clientIp) {
    const byIp = await consumeRateLimit("login:ip", clientIp, LOGIN_IP_POLICY);
    if (!byIp.allowed) return byIp;
  }
  return consumeRateLimit("login:email", email, LOGIN_EMAIL_POLICY);
}

/** A successful login is not a failed attempt: give back what takeLoginAttempt took. */
async function giveBackLoginAttempt(email: string, clientIp: string | null) {
  await refundRateLimit("login:email", email, LOGIN_EMAIL_POLICY);
  if (clientIp) await refundRateLimit("login:ip", clientIp, LOGIN_IP_POLICY);
}

/**
 * Application service shared by the login Server Action and the REST route handler:
 * validate input -> take an attempt from the rate limits -> check credentials -> start a
 * session.
 *
 * Rate limits (src/shared/lib/rate-limit.ts): 5 failed attempts per email and 20 per
 * client IP every 15 minutes. The attempt is counted *before* the password is checked
 * and given back if it succeeds, so only failures count and N parallel attempts can never
 * check more than the limit. Once limited, the password is not even verified, and an
 * unknown email is limited exactly like a known one (nothing reveals which exist).
 */
export async function signIn(
  input: unknown,
  { clientIp }: SignInContext,
): Promise<SignInResult> {
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
  const attempt = await takeLoginAttempt(email, clientIp);
  if (!attempt.allowed) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSeconds: attempt.retryAfterSeconds,
    };
  }

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

  await giveBackLoginAttempt(email, clientIp);
  await createSession(result.userId, { remember });
  return { ok: true, userId: result.userId };
}

export async function signOut(): Promise<void> {
  await deleteSession();
}
