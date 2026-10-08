import "server-only";

import bcrypt from "bcryptjs";

import {
  LOGIN_EMAIL_CLIENT_POLICY,
  LOGIN_EMAIL_POLICY,
  LOGIN_IP_POLICY,
  type RateLimitPolicy,
} from "@/shared/lib/rate-limit";
import {
  validationDetails,
  type ValidationDetails,
} from "@/shared/lib/validation";
import {
  consumeRateLimit,
  refundRateLimit,
  type RateLimitScope,
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
  /**
   * The caller's client IP (src/shared/server/client-ip.ts). Null skips the per-IP limit,
   * and every such request for an email shares one email+client bucket (see below).
   */
  clientIp: string | null;
};

/**
 * Stands in for the IP in the email+client key when the request carries none: those
 * requests (no proxy header, e.g. a bare local server) share one tight bucket per email,
 * which is the old per-email behaviour. On Vercel every request carries the client IP.
 */
const UNKNOWN_CLIENT = "unknown";

type Bucket = { scope: RateLimitScope; key: string; policy: RateLimitPolicy };
type TakenBucket = Bucket & { windowStart: Date };

/**
 * The buckets one login attempt draws from, in order:
 * 1. the client IP (20): one client trying many accounts;
 * 2. the email from this client (5): one client guessing one account's password. Keyed by
 *    email *and* IP, so a third party who knows the email only locks themselves out;
 * 3. the email from every client (50): guessing spread over many IPs.
 * IP first: a client already blocked by IP cannot burn a victim's email budgets.
 */
function loginBuckets(email: string, clientIp: string | null): Bucket[] {
  const buckets: Bucket[] = [];
  if (clientIp) {
    buckets.push({ scope: "login:ip", key: clientIp, policy: LOGIN_IP_POLICY });
  }
  buckets.push(
    {
      scope: "login:email-client",
      key: `${email}|${clientIp ?? UNKNOWN_CLIENT}`,
      policy: LOGIN_EMAIL_CLIENT_POLICY,
    },
    { scope: "login:email", key: email, policy: LOGIN_EMAIL_POLICY },
  );
  return buckets;
}

type LoginAttempt =
  | { allowed: true; taken: TakenBucket[] }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Takes one attempt from each bucket in turn, stopping at the first that refuses (the
 * later ones are not charged). Each take is atomic in PostgreSQL, so parallel guesses
 * cannot slip past a limit.
 */
async function takeLoginAttempt(
  email: string,
  clientIp: string | null,
): Promise<LoginAttempt> {
  const taken: TakenBucket[] = [];
  for (const bucket of loginBuckets(email, clientIp)) {
    const hit = await consumeRateLimit(bucket.scope, bucket.key, bucket.policy);
    if (!hit.allowed) {
      return { allowed: false, retryAfterSeconds: hit.retryAfterSeconds };
    }
    taken.push({ ...bucket, windowStart: hit.windowStart });
  }
  return { allowed: true, taken };
}

/**
 * A successful login is not a failed attempt: give back what takeLoginAttempt took, in
 * the window each hit was counted in. Best effort: the password was right, so a refund
 * that fails (database hiccup) is logged and the login goes ahead; the worst case is one
 * attempt counted that should not have been.
 */
async function giveBackLoginAttempt(taken: readonly TakenBucket[]) {
  const results = await Promise.allSettled(
    taken.map(({ scope, key, windowStart }) =>
      refundRateLimit(scope, key, windowStart),
    ),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Giving back a login attempt failed", result.reason);
    }
  }
}

/**
 * Application service shared by the login Server Action and the REST route handler:
 * validate input -> take an attempt from the rate limits -> check credentials -> start a
 * session.
 *
 * Rate limits (src/shared/lib/rate-limit.ts), every 15 minutes: 5 failed attempts per
 * email from one client IP, 50 per email overall and 20 per client IP (see loginBuckets).
 * The attempt is counted *before* the password is checked and given back if it succeeds,
 * so only failures count and N parallel attempts can never check more than the limit.
 * Once limited, the password is not even verified, and an unknown email is limited
 * exactly like a known one (nothing reveals which exist).
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

  await giveBackLoginAttempt(attempt.taken);
  await createSession(result.userId, { remember });
  return { ok: true, userId: result.userId };
}

export async function signOut(): Promise<void> {
  await deleteSession();
}
