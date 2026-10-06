import { spawn } from "node:child_process";

import { prepareTestDatabase } from "./test-database";

/*
 * Prepares the test database (create, migrate, seed) and, if given a command, runs it with
 * DATABASE_URL pointing there, e.g. a production server for local measurement scripts:
 *
 *   pnpm db:test                      # only prepare it
 *   pnpm with-test-db next start -p 3200
 */
async function main() {
  const command = process.argv.slice(2).filter((arg) => arg !== "--");
  const testUrl = await prepareTestDatabase({ seed: true });
  const name = new URL(testUrl).pathname.slice(1);
  console.log(`Test database ready: ${name}`);
  if (command.length === 0) return;

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
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
