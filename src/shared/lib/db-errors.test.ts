// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  adapterError,
  prismaInitializationError,
  prismaKnownError,
  prismaUnknownRequestError,
} from "@/test/db-errors";

import { classifyDatabaseError, type DatabaseErrorKind } from "./db-errors";

function socketError(code: string) {
  return Object.assign(new Error(`connect ${code}`), { code });
}

const CASES: [label: string, error: unknown, expected: DatabaseErrorKind][] = [
  // Unreachable or timed out: retrying later can work.
  ["P1001 can't reach the server", prismaKnownError("P1001"), "unavailable"],
  ["P1002 the server timed out", prismaKnownError("P1002"), "unavailable"],
  ["P1008 operation timed out", prismaKnownError("P1008"), "unavailable"],
  [
    "P1017 the server closed the connection",
    prismaKnownError("P1017"),
    "unavailable",
  ],
  ["P2024 pool timeout", prismaKnownError("P2024"), "unavailable"],
  [
    "ECONNREFUSED as the Prisma code (observed)",
    prismaKnownError("ECONNREFUSED"),
    "unavailable",
  ],
  [
    "ETIMEDOUT as the Prisma code",
    prismaKnownError("ETIMEDOUT"),
    "unavailable",
  ],
  [
    "ENOTFOUND as the Prisma code",
    prismaKnownError("ENOTFOUND"),
    "unavailable",
  ],
  [
    "unknown host on a model query (observed)",
    adapterError("P1001", { kind: "DatabaseNotReachable" }),
    "unavailable",
  ],
  [
    "unknown host on a raw query (observed)",
    adapterError("P2010", { kind: "DatabaseNotReachable" }),
    "unavailable",
  ],
  [
    "a raw query lost its connection",
    adapterError("P2010", { kind: "ConnectionClosed" }),
    "unavailable",
  ],
  [
    "a raw query socket timeout",
    adapterError("P2010", { kind: "SocketTimeout" }),
    "unavailable",
  ],
  [
    "Postgres has no free connections",
    adapterError("P2010", { kind: "TooManyConnections" }),
    "unavailable",
  ],
  [
    "P1001 while initializing",
    prismaInitializationError("P1001"),
    "unavailable",
  ],
  ["a bare Node socket error", socketError("ECONNREFUSED"), "unavailable"],
  [
    "pg-pool connection timeout (observed, no code)",
    new Error("Connection terminated due to connection timeout"),
    "unavailable",
  ],
  [
    "pg-pool checkout timeout (no code)",
    new Error("timeout exceeded when trying to connect"),
    "unavailable",
  ],

  // The server answered and rejected the configuration: retrying cannot help.
  [
    "wrong user or password on a model query (observed P1000 / 28P01)",
    adapterError("P1000", {
      kind: "AuthenticationFailed",
      originalCode: "28P01",
    }),
    "misconfigured",
  ],
  [
    "wrong password on a raw query (observed P2010 / 28P01)",
    adapterError("P2010", {
      kind: "AuthenticationFailed",
      originalCode: "28P01",
    }),
    "misconfigured",
  ],
  [
    "missing database on a model query (observed P1003 / 3D000)",
    adapterError("P1003", {
      kind: "DatabaseDoesNotExist",
      originalCode: "3D000",
    }),
    "misconfigured",
  ],
  [
    "missing database on a raw query (observed P2010 / 3D000)",
    adapterError("P2010", {
      kind: "DatabaseDoesNotExist",
      originalCode: "3D000",
    }),
    "misconfigured",
  ],
  [
    "access denied (P1010 / 28000)",
    adapterError("P1010", {
      kind: "DatabaseAccessDenied",
      originalCode: "28000",
    }),
    "misconfigured",
  ],
  ["P1000 without adapter details", prismaKnownError("P1000"), "misconfigured"],
  [
    "a TLS certificate problem",
    adapterError("P2010", { kind: "TlsConnectionError" }),
    "misconfigured",
  ],
  [
    "P1000 while initializing",
    prismaInitializationError("P1000"),
    "misconfigured",
  ],
  ["a bare pg authentication error", socketError("28P01"), "misconfigured"],

  // Everything else is a bug or bad data until proven otherwise.
  [
    "a unique constraint violation (P2002)",
    prismaKnownError("P2002"),
    "unclassified",
  ],
  [
    "a raw query with a SQL bug",
    adapterError("P2010", { kind: "ColumnNotFound" }),
    "unclassified",
  ],
  [
    "an unknown Prisma request error",
    prismaUnknownRequestError(),
    "unclassified",
  ],
  [
    "an initialization error without a code",
    prismaInitializationError(),
    "unclassified",
  ],
  [
    "a programming error",
    new TypeError("Cannot read properties of undefined"),
    "unclassified",
  ],
  ["a generic error", new Error("boom"), "unclassified"],
  ["a non-error value", "ECONNREFUSED", "unclassified"],
  ["null", null, "unclassified"],
];

describe("classifyDatabaseError", () => {
  it.each(CASES)("%s", (_label, error, expected) => {
    expect(classifyDatabaseError(error)).toBe(expected);
  });
});
