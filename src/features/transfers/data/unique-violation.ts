import { Prisma } from "@/generated/prisma/client";

/**
 * The unique index a write violated, or null. With Prisma 7 + @prisma/adapter-pg a
 * PostgreSQL 23505 surfaces as P2002 with the index name in
 * `meta.driverAdapterError.cause.constraint.index` (observed, e.g. "Movement_reference_key").
 * Null when it is not a unique violation or the driver does not name the index: callers
 * must not guess which constraint failed.
 */
export function violatedUniqueIndex(error: unknown): string | null {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return null;
  }
  const index = (
    error.meta as
      | {
          driverAdapterError?: { cause?: { constraint?: { index?: unknown } } };
        }
      | undefined
  )?.driverAdapterError?.cause?.constraint?.index;
  return typeof index === "string" ? index : null;
}
