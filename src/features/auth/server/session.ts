import "server-only";

import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  getSessionExpiry,
  getSessionKey,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./session-token";

/** Signs a session for the user and stores it in the httpOnly cookie. */
export async function createSession(
  userId: string,
  { remember }: { remember: boolean },
): Promise<void> {
  const expiresAt = getSessionExpiry(remember);
  const token = await signSessionToken(userId, {
    key: getSessionKey(),
    expiresAt,
  });
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    token,
    buildSessionCookieOptions({ remember, expiresAt }),
  );
}

export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySessionToken(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
    getSessionKey(),
  );
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
