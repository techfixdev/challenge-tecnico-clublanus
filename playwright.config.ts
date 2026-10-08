import { defineConfig, devices } from "@playwright/test";

import { testDatabaseUrl } from "./scripts/test-database";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

const MOBILE = {
  ...devices["Desktop Chrome"],
  viewport: { width: 390, height: 844 },
};
const MUTATING_SPECS = /transfers\.spec\.ts/;

// Runs against its own database (`granabank_test`, see scripts/test-database.ts), never
// the one `pnpm dev` uses: the web server and the fixtures that read the database
// directly (e2e/fixtures/transfers-db.ts) both get this URL.
const DATABASE_URL = testDatabaseUrl();

/**
 * End-to-end smoke tests. Requires Postgres up (`pnpm db:up`); the global setup creates,
 * migrates and seeds the test database on every run.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium",
      testIgnore: MUTATING_SPECS,
      use: MOBILE,
    },
    {
      // Specs that move the demo users' money run only after every read-only spec has
      // finished, so none of those ever sees a balance or movement mid-transfer.
      name: "mobile-chromium-mutating",
      testMatch: MUTATING_SPECS,
      dependencies: ["mobile-chromium"],
      use: MOBILE,
    },
  ],
  webServer: {
    // CI tests the production build (`pnpm build` runs first); locally, the dev server.
    command: process.env.CI
      ? `pnpm start --port ${PORT}`
      : `pnpm dev --port ${PORT}`,
    // Next reads `.env` but never overrides a variable already in the environment.
    env: { DATABASE_URL },
    url: `${baseURL}/login`,
    // Never reuse a server already on the port: its DATABASE_URL is unknown (a leftover
    // server pointed at the dev database would let the specs move the demo balances).
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
