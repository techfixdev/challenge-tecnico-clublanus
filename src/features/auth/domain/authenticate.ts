/**
 * Login use case: checks credentials against a user store.
 * Pure domain logic; persistence and hashing are injected so it is unit-testable.
 */

export type StoredCredentials = { id: string; passwordHash: string };

export type AuthenticateDeps = {
  findUserByEmail(email: string): Promise<StoredCredentials | null>;
  verifyPassword(plain: string, hash: string): Promise<boolean>;
};

export type AuthenticateResult = { ok: true; userId: string } | { ok: false };

/**
 * A valid bcrypt hash (cost 10, same as stored passwords) of a random throwaway value.
 * Comparing against it when the email is unknown makes both failure paths take roughly
 * the same time, so response timing does not reveal which emails are registered.
 */
export const DUMMY_PASSWORD_HASH =
  "$2b$10$tOt9kKUiRR6dndnDFUG.b.1gRMb70RTA2dv4QyTXNf9GIJt8vbLBO";

export async function authenticate(
  credentials: { email: string; password: string },
  deps: AuthenticateDeps,
): Promise<AuthenticateResult> {
  const user = await deps.findUserByEmail(credentials.email);
  const passwordMatches = await deps.verifyPassword(
    credentials.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) {
    return { ok: false };
  }
  return { ok: true, userId: user.id };
}
