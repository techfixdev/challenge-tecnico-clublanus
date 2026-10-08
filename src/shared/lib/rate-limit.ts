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

/** Failed logins per normalized email: slows guessing one account's password. */
export const LOGIN_EMAIL_POLICY: RateLimitPolicy = {
  limit: 5,
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

/** The most restrictive of several decisions: refused if any is, waiting the longest. */
export function combineDecisions(
  decisions: readonly RateLimitDecision[],
): RateLimitDecision {
  let combined: RateLimitDecision = {
    allowed: true,
    remaining: Number.POSITIVE_INFINITY,
  };
  for (const decision of decisions) {
    if (!decision.allowed) {
      combined = {
        allowed: false,
        retryAfterSeconds: Math.max(
          decision.retryAfterSeconds,
          combined.allowed ? 0 : combined.retryAfterSeconds,
        ),
      };
    } else if (combined.allowed) {
      combined = {
        allowed: true,
        remaining: Math.min(combined.remaining, decision.remaining),
      };
    }
  }
  return combined;
}

/** "Demasiados intentos. Probá de nuevo en 3 minutos." (whole minutes, rounded up). */
export function tooManyAttemptsMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  const unit = minutes === 1 ? "minuto" : "minutos";
  return `Demasiados intentos. Probá de nuevo en ${minutes} ${unit}.`;
}
