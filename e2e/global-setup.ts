import {
  claimTestDatabase,
  prepareTestDatabase,
} from "../scripts/test-database";
import { resetAllRateLimits } from "./fixtures/rate-limits";

/**
 * Resets the e2e database before every run: created if missing, migrated, seeded and its
 * rate-limit counters emptied, so the seed facts the specs assert hold whatever an earlier
 * (maybe aborted) run left.
 * Playwright starts the web server first; its readiness check (`/login`) reads no data.
 *
 * The run claims the database first and keeps it until the end (the returned function is
 * the global teardown): another run started meanwhile, from this or another worktree,
 * would reseed it under these specs, so it fails at once instead.
 */
export default async function globalSetup() {
  const release = await claimTestDatabase();
  try {
    await prepareTestDatabase({ seed: true });
    // The seed leaves the rate-limit counters alone: a previous run's failed logins or
    // reveals must not carry over into this one.
    await resetAllRateLimits();
  } catch (error) {
    await release();
    throw error;
  }
  return release;
}
