import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { ROUTES } from "@/shared/lib/routes";

import type { SessionUser } from "../data/user-repository";
import { readSessionUser } from "./session";

/**
 * Data-access-layer check (the authority): the proxy only does an optimistic signature
 * check, so every server read re-verifies the token and requires a live session row,
 * loading the user in the same query. Memoized per request with React `cache`, so a page
 * and its components share one lookup.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> =>
  readSessionUser(),
);

/** Returns the signed-in user or redirects to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    // Signed cookie whose session was revoked or expired, or whose user is gone: the proxy
    // clears the cookie on this URL.
    redirect(ROUTES.loginExpired);
  }
  return user;
}
