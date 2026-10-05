import "server-only";

import { db } from "@/shared/lib/db";

import type { StoredCredentials } from "../domain/authenticate";

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

/** Only selects what authentication needs; the hash never leaves the server. */
export function findCredentialsByEmail(
  email: string,
): Promise<StoredCredentials | null> {
  return db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
}

export function findSessionUserById(id: string): Promise<SessionUser | null> {
  return db.user.findUnique({
    where: { id },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
}
