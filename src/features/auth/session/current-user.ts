import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { ROUTES } from "@/shared/lib/routes";

import { findSessionUserById, type SessionUser } from "../data/user-repository";
import { readSession } from "./session";

/**
 * Data-access-layer check (defense in depth): the proxy only does an optimistic signature
 * check, so every server read re-verifies the session and loads the user from the database.
 * Memoized per request with React `cache`.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await readSession();
  if (!session) return null;
  return findSessionUserById(session.userId);
});

/** Returns the signed-in user or redirects to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    // Valid cookie but unknown user: the proxy clears the cookie on this URL.
    redirect(ROUTES.loginExpired);
  }
  return user;
}
