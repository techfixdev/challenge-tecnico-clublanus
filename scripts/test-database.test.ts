import { describe, expect, it } from "vitest";

import { testDatabaseUrl } from "./test-database";

const DEV =
  "postgresql://granabank:granabank@localhost:5432/granabank?schema=public";

/** The guard that keeps automated runs (and their seed) away from the dev database. */
describe("testDatabaseUrl", () => {
  it("appends _test to the dev database name, keeping host, credentials and params", () => {
    expect(testDatabaseUrl({ DATABASE_URL: DEV })).toBe(
      "postgresql://granabank:granabank@localhost:5432/granabank_test?schema=public",
    );
  });

  it("keeps a DATABASE_URL that already points at the test database (child processes)", () => {
    const test = DEV.replace("/granabank?", "/granabank_test?");
    expect(testDatabaseUrl({ DATABASE_URL: test })).toBe(test);
  });

  it("prefers TEST_DATABASE_URL when it names a _test database", () => {
    const explicit = "postgresql://u:p@db:5432/other_test";
    expect(
      testDatabaseUrl({ DATABASE_URL: DEV, TEST_DATABASE_URL: explicit }),
    ).toBe(explicit);
  });

  it("refuses a TEST_DATABASE_URL that is not a _test database (e.g. the dev one)", () => {
    expect(() =>
      testDatabaseUrl({ DATABASE_URL: DEV, TEST_DATABASE_URL: DEV }),
    ).toThrow("must end with _test");
  });

  it("does not take a name that merely contains _test as the test database", () => {
    const tricky = DEV.replace("/granabank?", "/granabank_test_copy?");
    expect(testDatabaseUrl({ DATABASE_URL: tricky })).toContain(
      "/granabank_test_copy_test?",
    );
  });

  it("fails loudly when no database is configured", () => {
    expect(() => testDatabaseUrl({})).toThrow(
      "Neither TEST_DATABASE_URL nor DATABASE_URL is set",
    );
  });
});
