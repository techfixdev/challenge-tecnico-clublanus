import { fileURLToPath } from "node:url";

import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

import { testDatabaseUrl } from "./scripts/test-database";

/**
 * Integration tests: real PostgreSQL (`pnpm db:up`), on the test database (never the one
 * `pnpm dev` uses), which the global setup creates and migrates before the run.
 * Kept out of `pnpm test` so the unit suite stays fast and needs no database.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "server-only": fileURLToPath(
        new URL("./src/test/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    globalSetup: ["./scripts/integration-global-setup.ts"],
    // `dotenv/config` fills the rest of `.env` and never overrides this DATABASE_URL.
    setupFiles: ["dotenv/config"],
    // Files share one database; run them one at a time.
    fileParallelism: false,
    // A non-UTC zone on purpose: dates must round-trip through SQL regardless of the
    // process time zone (e.g. the `::timestamp` cast of the pagination cursor).
    env: {
      TZ: "America/Argentina/Buenos_Aires",
      DATABASE_URL: testDatabaseUrl(),
    },
  },
});
