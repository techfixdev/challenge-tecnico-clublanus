import { Prisma } from "@/generated/prisma/client";

/** What Prisma 7 + the pg adapter throws when Postgres refuses the connection. */
export function databaseUnavailableError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    "connect ECONNREFUSED 127.0.0.1:5432",
    { code: "ECONNREFUSED", clientVersion: "7.10.0" },
  );
}
