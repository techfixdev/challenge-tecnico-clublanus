import { spawn } from "node:child_process";

import { claimTestDatabase, prepareTestDatabase } from "./test-database";

/*
 * Prepares the test database (create, migrate, seed) and, if given a command, runs it with
 * DATABASE_URL pointing there, e.g. a production server for local measurement scripts:
 *
 *   pnpm db:test                      # only prepare it
 *   pnpm db:test next start -p 3200
 *
 * It claims the database while it runs (see `claimTestDatabase`): an e2e run started
 * meanwhile would reseed it under the command, so one of the two fails at once.
 */
async function main() {
  const command = process.argv.slice(2).filter((arg) => arg !== "--");
  const release = await claimTestDatabase();
  const testUrl = await prepareTestDatabase({ seed: true }).catch(
    async (error: unknown) => {
      await release();
      throw error;
    },
  );
  const name = new URL(testUrl).pathname.slice(1);
  console.log(`Test database ready: ${name}`);
  if (command.length === 0) {
    await release();
    return;
  }

  const child = spawn(command[0], command.slice(1), {
    stdio: "inherit",
    // Next and Prisma load `.env` without overriding variables already set.
    env: { ...process.env, DATABASE_URL: testUrl },
    shell: process.platform === "win32",
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("exit", (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
    void release();
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
