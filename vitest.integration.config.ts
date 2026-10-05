import { fileURLToPath } from "node:url";

import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Integration tests: real PostgreSQL (`pnpm db:up && pnpm db:migrate && pnpm db:seed`).
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
    setupFiles: ["dotenv/config"],
    // Files share one database; run them one at a time.
    fileParallelism: false,
    // A non-UTC zone on purpose: dates must round-trip through SQL regardless of the
    // process time zone (e.g. the `::timestamp` cast of the pagination cursor).
    env: { TZ: "America/Argentina/Buenos_Aires" },
  },
});
