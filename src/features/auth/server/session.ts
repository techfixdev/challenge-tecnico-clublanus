import "server-only";

import { cookies } from "next/headers";

import {
  deleteDeadSessions,
  findLiveSessionUser,
  insertSession,
  revokeAllUserSessions,
  revokeSessionById,
} from "../data/session-repository";
import type { SessionUser } from "../data/user-repository";
import {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  generateSessionId,
  getSessionExpiry,
  getSessionKey,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./session-token";

/**
 * Revocable sessions. The cookie holds a signed token naming a `Session` row:
 * - `proxy.ts` only checks the signature (fast, optimistic, no database);
 * - the server is the authority: `readSessionUser` (behind `getCurrentUser`/`requireUser`,
 *   used by pages, Server Actions and API routes) also requires a live row.
 * Logging out revokes the row, so a copied token stops working at once.
 */

/** Starts a session: inserts its row, then stores the signed token in the httpOnly cookie. */
export async function createSession(
  userId: string,
  { remember }: { remember: boolean },
): Promise<void> {
  const expiresAt = getSessionExpiry(remember);
  const sessionId = generateSessionId();
  // Housekeeping only: a failure here must not stop the sign-in.
  await deleteDeadSessions(userId).catch((error: unknown) => {
    console.error("Could not delete dead sessions", error);
  });
  await insertSession({ id: sessionId, userId, expiresAt });
  const token = await signSessionToken(
    { userId, sessionId },
    { key: getSessionKey(), expiresAt },
  );
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    token,
    buildSessionCookieOptions({ remember, expiresAt }),
  );
}

/** The session the cookie's token names, checked by signature only (no database). */
async function readSessionToken(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySessionToken(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
    getSessionKey(),
  );
}

/**
 * The signed-in user, or `null` when the token is missing, forged or expired, or its
 * session row was revoked, expired or deleted. The authoritative check.
 */
export async function readSessionUser(): Promise<SessionUser | null> {
  const session = await readSessionToken();
  if (!session) return null;
  return findLiveSessionUser(session);
}

/**
 * Logout: revokes the current session row (server side), then deletes the cookie. If the
 * revoke fails the cookie is still deleted, so the user can always sign out on this
 * device; the row then lives until it expires, and the failure is logged.
 */
export async function deleteSession(): Promise<void> {
  const session = await readSessionToken();
  if (session) {
    await revokeSessionById(session.sessionId).catch((error: unknown) => {
      console.error("Could not revoke the session on logout", error);
    });
  }
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * "Sign out on every device": revokes every live session of the user. Data-layer
 * capability only (no route or UI by design); returns how many sessions were revoked.
 */
export function revokeAllSessionsForUser(userId: string): Promise<number> {
  return revokeAllUserSessions(userId);
}
