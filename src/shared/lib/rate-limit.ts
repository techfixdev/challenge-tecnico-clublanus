/**
 * Fixed-window rate limiting as pure functions: the policy (how many hits per window),
 * which window an instant falls in, and the verdict for a hit given the window's count.
 * The counter itself lives in PostgreSQL (src/shared/server/rate-limit-store.ts), so the
 * limit holds across serverless instances; this module has no I/O and is unit-tested.
 *
 * Fixed window, not a sliding log: one row per key and window, incremented in a single
 * `INSERT … ON CONFLICT DO UPDATE` statement, so concurrent hits cannot race and the
 * table stays small. The known trade-off: a client can spend a full window's budget at
 * the end of one window and again at the start of the next (at most 2× the limit in a
 * short burst), which is acceptable for slowing down password guessing.
 */

export type RateLimitPolicy = {
  /** Hits allowed per window; the next one is refused. */
  limit: number;
  windowMs: number;
};

export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

const MINUTE_MS = 60_000;

/**
 * Failed logins per normalized email *from one client IP*: the tight limit that stops one
 * client guessing an account's password. Keyed by email and IP together, so whoever
 * exhausts it only locks themselves out, never the account's owner on another network.
 */
export const LOGIN_EMAIL_CLIENT_POLICY: RateLimitPolicy = {
  limit: 5,
  windowMs: 15 * MINUTE_MS,
};

/**
 * Failed logins per normalized email from every client together: a much looser cap that
 * still slows guessing spread over many IPs. Reaching it does lock the account out for
 * the rest of the window, but takes ten times the tight limit's attempts.
 */
export const LOGIN_EMAIL_POLICY: RateLimitPolicy = {
  limit: 50,
  windowMs: 15 * MINUTE_MS,
};

/** Failed logins per client IP: slows one client trying many accounts. */
export const LOGIN_IP_POLICY: RateLimitPolicy = {
  limit: 20,
  windowMs: 15 * MINUTE_MS,
};

/** Card detail reveals (full number, CVV, balance) per signed-in user. */
export const CARD_REVEAL_POLICY: RateLimitPolicy = {
  limit: 10,
  windowMs: 10 * MINUTE_MS,
};

/** Start of the window `now` falls in; windows are aligned to the Unix epoch. */
export function windowStartFor(now: Date, policy: RateLimitPolicy): Date {
  const ms = now.getTime();
  return new Date(ms - (ms % policy.windowMs));
}

/** Whole seconds until the window that started at `windowStart` ends (at least 1). */
export function secondsUntilWindowEnds(
  windowStart: Date,
  now: Date,
  policy: RateLimitPolicy,
): number {
  const endsAt = windowStart.getTime() + policy.windowMs;
  return Math.max(1, Math.ceil((endsAt - now.getTime()) / 1000));
}

/**
 * Verdict for a hit, given the window's count *including* this hit (what the atomic
 * increment returns): the first `limit` hits pass, every later one is refused until the
 * window ends.
 */
export function decide(
  countIncludingThisHit: number,
  windowStart: Date,
  now: Date,
  policy: RateLimitPolicy,
): RateLimitDecision {
  if (countIncludingThisHit <= policy.limit) {
    return { allowed: true, remaining: policy.limit - countIncludingThisHit };
  }
  return {
    allowed: false,
    retryAfterSeconds: secondsUntilWindowEnds(windowStart, now, policy),
  };
}

/** "Demasiados intentos. Probá de nuevo en 3 minutos." (whole minutes, rounded up). */
export function tooManyAttemptsMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  const unit = minutes === 1 ? "minuto" : "minutos";
  return `Demasiados intentos. Probá de nuevo en ${minutes} ${unit}.`;
}
