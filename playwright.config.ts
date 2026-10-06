import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

const MOBILE = {
  ...devices["Desktop Chrome"],
  viewport: { width: 390, height: 844 },
};
const MUTATING_SPECS = /transfers\.spec\.ts/;

/** End-to-end smoke tests. Requires Postgres up and seeded (`pnpm db:up && pnpm db:seed`). */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
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
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
