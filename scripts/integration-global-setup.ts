import { prepareTestDatabase } from "./test-database";

/**
 * Vitest global setup for `pnpm test:integration`: creates and migrates the test database.
 * No seed: every integration test creates and deletes its own data.
 */
export default async function setup() {
  await prepareTestDatabase({ seed: false });
}
