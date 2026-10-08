import { describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";

import { violatedUniqueIndex } from "./unique-violation";

/** The shape Prisma 7 + @prisma/adapter-pg produces for a PostgreSQL 23505 (observed). */
function uniqueViolation(index: string) {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7",
    meta: {
      driverAdapterError: {
        name: "DriverAdapterError",
        cause: {
          originalCode: "23505",
          kind: "UniqueConstraintViolation",
          constraint: { index },
          table: "Movement",
        },
      },
      modelName: "Movement",
    },
  });
}

describe("violatedUniqueIndex", () => {
  it("names the unique index a P2002 hit", () => {
    expect(violatedUniqueIndex(uniqueViolation("Movement_reference_key"))).toBe(
      "Movement_reference_key",
    );
  });

  it("is null for anything that is not a unique violation", () => {
    expect(violatedUniqueIndex(new Error("boom"))).toBeNull();
    expect(
      violatedUniqueIndex(
        new Prisma.PrismaClientKnownRequestError("Not found", {
          code: "P2025",
          clientVersion: "7",
        }),
      ),
    ).toBeNull();
  });

  it("is null when the driver does not say which index (never guess)", () => {
    expect(
      violatedUniqueIndex(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "7",
        }),
      ),
    ).toBeNull();
  });
});
