import { Prisma } from "@/generated/prisma/client";

/*
 * Prisma error fixtures shaped like what Prisma 7.10 + the pg driver adapter actually throws
 * (observed against a local PostgreSQL 17 with a wrong password, a missing database, a closed
 * port and an unknown host). Tests build errors here instead of hand-rolling them.
 */

const CLIENT_VERSION = "7.10.0";

export function prismaKnownError(
  code: string,
  meta?: Record<string, unknown>,
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Database error", {
    code,
    clientVersion: CLIENT_VERSION,
    meta,
  });
}

/**
 * A failure the pg adapter translated: `meta.driverAdapterError.cause` carries its `kind`
 * and, for errors Postgres answered with, the SQLSTATE as `originalCode`. Model queries get
 * a P1xxx code; raw queries always get `P2010`.
 */
export function adapterError(
  code: string,
  cause: { kind: string; originalCode?: string },
): Prisma.PrismaClientKnownRequestError {
  return prismaKnownError(code, {
    driverAdapterError: { name: "DriverAdapterError", cause },
  });
}

export function prismaInitializationError(
  errorCode?: string,
): Prisma.PrismaClientInitializationError {
  return new Prisma.PrismaClientInitializationError(
    "Init failed",
    CLIENT_VERSION,
    errorCode,
  );
}

export function prismaUnknownRequestError(): Prisma.PrismaClientUnknownRequestError {
  return new Prisma.PrismaClientUnknownRequestError("Unknown failure", {
    clientVersion: CLIENT_VERSION,
  });
}

/** Postgres refused the connection: the adapter surfaces the socket code as `code`. */
export function databaseUnavailableError(): Prisma.PrismaClientKnownRequestError {
  return prismaKnownError("ECONNREFUSED");
}

/** Wrong user or password in DATABASE_URL (a model query). */
export function databaseAuthenticationError(): Prisma.PrismaClientKnownRequestError {
  return adapterError("P1000", {
    kind: "AuthenticationFailed",
    originalCode: "28P01",
  });
}
