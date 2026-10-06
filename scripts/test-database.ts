import "dotenv/config";

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { Client } from "pg";

/*
 * The database automated runs use (Playwright e2e, integration tests, local measurement
 * scripts), kept apart from the one `pnpm dev` reads, so a test transfer never moves the
 * demo balances someone is checking by hand. Same PostgreSQL server, another database:
 * `TEST_DATABASE_URL` if set, otherwise `DATABASE_URL` with `_test` appended to the
 * database name (`granabank` → `granabank_test`).
 */

// Every entry point (pnpm scripts, Playwright, Vitest) runs from the repository root.
const ROOT = process.cwd();
const SAFE_NAME = /^[A-Za-z0-9_]+$/;

function databaseName(url: URL): string {
  return decodeURIComponent(url.pathname.replace(/^\//, ""));
}

/** The test database's connection string. Throws if it would be the dev database. */
export function testDatabaseUrl(
  env: Partial<Record<string, string>> = process.env,
): string {
  const devUrl = env.DATABASE_URL;
  let testUrl = env.TEST_DATABASE_URL;
  if (!testUrl) {
    if (!devUrl)
      throw new Error("Neither TEST_DATABASE_URL nor DATABASE_URL is set");
    const url = new URL(devUrl);
    const name = databaseName(url);
    // Idempotent: a process that already points DATABASE_URL at the test database
    // (e.g. a child of the Playwright runner) keeps it.
    url.pathname = `/${name.endsWith("_test") ? name : `${name}_test`}`;
    testUrl = url.toString();
  }
  if (!databaseName(new URL(testUrl)).endsWith("_test")) {
    // Guards against seeding the dev database by mistake (e.g. TEST_DATABASE_URL copied
    // from DATABASE_URL): the seed rewrites the demo users' data.
    throw new Error("The test database name must end with _test");
  }
  return testUrl;
}

/** Creates the database if missing, connecting to the server's `postgres` database. */
async function createIfMissing(testUrl: string): Promise<void> {
  const name = databaseName(new URL(testUrl));
  if (!SAFE_NAME.test(name)) throw new Error(`Unsafe database name: ${name}`);
  const maintenance = new URL(testUrl);
  maintenance.pathname = "/postgres";
  maintenance.search = "";
  const client = new Client({ connectionString: maintenance.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [name],
    );
    if (rowCount) return;
    await client.query(`CREATE DATABASE "${name}"`);
  } catch (error) {
    // Two runners preparing at once: the other one created it first.
    if ((error as { code?: string }).code !== "42P04") throw error;
  } finally {
    await client.end();
  }
}

/**
 * Prisma's CLI entry point, as its own package.json declares it (`bin`), resolved the way
 * Node resolves the dependency (pnpm's symlinked store included). It is run through Node
 * itself: `node_modules/.bin/prisma` is a shell script on Unix and a `.cmd` shim on
 * Windows, which execFileSync cannot start there.
 */
export function prismaCliPath(root = ROOT): string {
  const manifest = createRequire(path.join(root, "package.json")).resolve(
    "prisma/package.json",
  );
  const { bin } = JSON.parse(readFileSync(manifest, "utf8")) as {
    bin?: string | Record<string, string>;
  };
  const entry = typeof bin === "string" ? bin : bin?.prisma;
  if (!entry) throw new Error("prisma/package.json declares no CLI (bin)");
  const cli = path.join(path.dirname(manifest), entry);
  if (!existsSync(cli)) throw new Error(`Prisma CLI not found at ${cli}`);
  return cli;
}

function prisma(args: string[], testUrl: string): void {
  execFileSync(process.execPath, [prismaCliPath(), ...args], {
    cwd: ROOT,
    // Prisma's config loads `.env` with dotenv, which never overrides a variable that is
    // already set: this DATABASE_URL wins.
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: ["ignore", "ignore", "inherit"],
  });
}

/**
 * Brings the test database to a known state: created if missing, every migration applied
 * and, with `seed`, the demo data reloaded (the seed wipes and recreates the demo users'
 * cards, movements and transfers). Returns its connection string.
 */
export async function prepareTestDatabase({
  seed,
}: {
  seed: boolean;
}): Promise<string> {
  const testUrl = testDatabaseUrl();
  await createIfMissing(testUrl);
  prisma(["migrate", "deploy"], testUrl);
  if (seed) prisma(["db", "seed"], testUrl);
  return testUrl;
}
