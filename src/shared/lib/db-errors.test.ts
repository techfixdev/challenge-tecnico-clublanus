// @vitest-environment node
import { describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";

import { isDatabaseUnavailableError } from "./db-errors";

const CLIENT_VERSION = "7.10.0";

function knownError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("Database error", {
    code,
    clientVersion: CLIENT_VERSION,
    meta,
  });
}

/** Shape the pg driver adapter attaches to raw-query failures (code P2010). */
function rawQueryError(kind: string) {
  return knownError("P2010", {
    driverAdapterError: { name: "DriverAdapterError", cause: { kind } },
  });
}

describe("isDatabaseUnavailableError", () => {
  it.each([
    [
      "the client could not initialize",
      new Prisma.PrismaClientInitializationError("Init failed", CLIENT_VERSION),
    ],
    ["the server is unreachable (P1001)", knownError("P1001")],
    ["the connection timed out (P1002)", knownError("P1002")],
    ["the server closed the connection (P1017)", knownError("P1017")],
    ["the pool timed out (P2024)", knownError("P2024")],
    [
      "the adapter could not connect (ECONNREFUSED)",
      knownError("ECONNREFUSED"),
    ],
    [
      "a raw query could not reach the server",
      rawQueryError("DatabaseNotReachable"),
    ],
    ["a raw query lost its connection", rawQueryError("ConnectionClosed")],
    [
      "a raw query was rejected for credentials",
      rawQueryError("AuthenticationFailed"),
    ],
    [
      "a plain Node socket error",
      Object.assign(new Error("connect ECONNREFUSED"), {
        code: "ECONNREFUSED",
      }),
    ],
  ])("is true when %s", (_label, error) => {
    expect(isDatabaseUnavailableError(error)).toBe(true);
  });

  it.each([
    ["a unique constraint violation (P2002)", knownError("P2002")],
    ["a raw query with a SQL bug", rawQueryError("ColumnNotFound")],
    [
      "a programming error",
      new TypeError("Cannot read properties of undefined"),
    ],
    ["a generic error", new Error("boom")],
    ["a non-error value", "boom"],
    ["null", null],
  ])("is false for %s", (_label, error) => {
    expect(isDatabaseUnavailableError(error)).toBe(false);
  });
});
