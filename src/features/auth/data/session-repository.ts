import "server-only";

import { db } from "@/shared/lib/db";

import type { SessionUser } from "./user-repository";

/**
 * Session rows (see the `Session` model). A session is live while its row exists, is not
 * revoked and has not expired; anything else signs the visitor out.
 */

export async function insertSession(session: {
  id: string;
  userId: string;
  expiresAt: Date;
}): Promise<void> {
  await db.session.create({ data: session });
}

/**
 * The user behind a live session, in one query. The user id from the signed token must
 * match the row's owner as well (a token can never be re-pointed at another session).
 */
export async function findLiveSessionUser(
  { sessionId, userId }: { sessionId: string; userId: string },
  now = new Date(),
): Promise<SessionUser | null> {
  const session = await db.session.findFirst({
    where: {
      id: sessionId,
      userId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    select: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });
  return session?.user ?? null;
}

/** Marks one session revoked. Idempotent: an already revoked or unknown id is a no-op. */
export async function revokeSessionById(sessionId: string): Promise<void> {
  await db.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** "Sign out on every device": revokes all of the user's live sessions; returns how many. */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const { count } = await db.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return count;
}

/**
 * Opportunistic cleanup, run on each sign-in: deletes that user's revoked or expired rows,
 * so the table stays bounded by live sessions without a scheduled job.
 */
export async function deleteDeadSessions(
  userId: string,
  now = new Date(),
): Promise<void> {
  await db.session.deleteMany({
    where: {
      userId,
      OR: [{ revokedAt: { not: null } }, { expiresAt: { lte: now } }],
    },
  });
}
