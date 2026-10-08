import { Client } from "pg";

import { testDatabaseUrl } from "../../scripts/test-database";

/**
 * Runs `run` with a connection to the database the e2e web server uses
 * (playwright.config.ts), never the dev one, and closes it afterwards.
 */
export async function withTestDb<T>(
  run: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}
