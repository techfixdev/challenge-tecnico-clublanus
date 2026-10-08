import { randomBytes } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";

import { isLanPreviewEnabled } from "@/shared/config/lan-preview";

/**
 * Session token (JWT, HS256) and its cookie settings. The token names a session row
 * (`jti`) and its user (`sub`); the signature lets `proxy.ts` reject forged or expired
 * tokens without a database hit, while the server checks the row (see ./session.ts).
 * Framework-free on purpose: it is used by both `proxy.ts` and server code, and unit-tested.
 */

export const SESSION_COOKIE_NAME = "granabank_session";

const ALGORITHM = "HS256";
const MIN_SECRET_LENGTH = 32;
const DAY_IN_SECONDS = 24 * 60 * 60;

export const SESSION_DURATION_SECONDS = {
  /** "Recordarme" checked: persistent cookie. */
  remembered: 30 * DAY_IN_SECONDS,
  /** "Recordarme" unchecked: browser-session cookie, token still expires within a day. */
  default: DAY_IN_SECONDS,
} as const;

export type SessionPayload = { userId: string; sessionId: string };

/** 32 random bytes (256 bits), base64url: an opaque, unguessable session id. */
export function generateSessionId(): string {
  return randomBytes(32).toString("base64url");
}

/** Encodes the signing key, failing fast with an actionable message on misconfiguration. */
export function getSessionKey(
  secret: string | undefined = process.env.SESSION_SECRET,
): Uint8Array {
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Add it to your environment (see .env.example).",
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`,
    );
  }
  return new TextEncoder().encode(secret);
}

export function getSessionExpiry(remember: boolean, now = new Date()): Date {
  const seconds = remember
    ? SESSION_DURATION_SECONDS.remembered
    : SESSION_DURATION_SECONDS.default;
  return new Date(now.getTime() + seconds * 1000);
}

export async function signSessionToken(
  { userId, sessionId }: SessionPayload,
  { key, expiresAt }: { key: Uint8Array; expiresAt: Date },
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(userId)
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key);
}

/**
 * Returns the session a valid token names, or `null` if it is missing, expired, forged or
 * malformed. Signature only: whether that session is still live is the server's call.
 */
export async function verifySessionToken(
  token: string | undefined,
  key: Uint8Array,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: [ALGORITHM],
    });
    return payload.sub && payload.jti
      ? { userId: payload.sub, sessionId: payload.jti }
      : null;
  } catch {
    return null;
  }
}

export type SessionCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  expires?: Date;
};

/**
 * - httpOnly: JavaScript (and therefore XSS) cannot read the token.
 * - sameSite=lax: the cookie is not sent on cross-site POSTs (CSRF), but top-level links still work.
 * - secure in production: only sent over HTTPS (localhost dev runs on plain HTTP). The one
 *   exception is the explicit local LAN preview (`GRANABANK_LAN_PREVIEW=1`, see
 *   shared/config/lan-preview.ts), which throws on Vercel instead of dropping Secure.
 * - `expires` only when remembered; otherwise it is a session cookie cleared when the browser closes.
 */
export function buildSessionCookieOptions({
  remember,
  expiresAt,
  isProduction = process.env.NODE_ENV === "production",
  env = process.env,
}: {
  remember: boolean;
  expiresAt: Date;
  isProduction?: boolean;
  env?: Readonly<Record<string, string | undefined>>;
}): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: isProduction && !isLanPreviewEnabled({ env, isProduction }),
    sameSite: "lax",
    path: "/",
    ...(remember ? { expires: expiresAt } : {}),
  };
}
