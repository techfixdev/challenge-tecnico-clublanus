import { prepareTestDatabase } from "../scripts/test-database";

/**
 * Resets the e2e database before every run: created if missing, migrated and seeded, so
 * the seed facts the specs assert hold whatever an earlier (maybe aborted) run left.
 * Playwright starts the web server first; its readiness check (`/login`) reads no data.
 */
export default async function globalSetup() {
  await prepareTestDatabase({ seed: true });
}
