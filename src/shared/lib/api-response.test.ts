// @vitest-environment node
import { notFound, redirect } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  databaseAuthenticationError,
  databaseUnavailableError,
  prismaUnknownRequestError,
} from "@/test/db-errors";

import {
  API_MESSAGES,
  apiError,
  isJsonContentType,
  withApiErrorHandling,
} from "./api-response";
import { validationDetails } from "./validation";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isJsonContentType", () => {
  it("accepts application/json with or without parameters, any casing", () => {
    expect(isJsonContentType("application/json")).toBe(true);
    expect(isJsonContentType("application/json; charset=utf-8")).toBe(true);
    expect(isJsonContentType(" Application/JSON ;charset=UTF-8")).toBe(true);
  });

  it("rejects other media types that merely contain the substring", () => {
    expect(isJsonContentType("text/plain; note=application/json")).toBe(false);
    expect(isJsonContentType("application/json-patch+json")).toBe(false);
    expect(isJsonContentType("application/jsonx")).toBe(false);
    expect(isJsonContentType("multipart/form-data")).toBe(false);
    expect(isJsonContentType(null)).toBe(false);
    expect(isJsonContentType("")).toBe(false);
  });
});

describe("apiError", () => {
  it("builds the shared error shape with the status for its code", async () => {
    const response = apiError("NOT_FOUND", "No encontramos ese movimiento");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "NOT_FOUND", message: "No encontramos ese movimiento" },
    });
  });

  it("includes details when given", async () => {
    const response = apiError("INVALID_INPUT", "Datos inválidos", {
      fieldErrors: { q: ["Muy largo"] },
      formErrors: [],
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INVALID_INPUT",
        message: "Datos inválidos",
        details: { fieldErrors: { q: ["Muy largo"] }, formErrors: [] },
      },
    });
  });
});

describe("validationDetails", () => {
  it("returns every field error and root-level errors", () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    const fieldResult = schema.safeParse({ a: 1, b: "x" });
    const rootResult = schema.safeParse(null);
    if (fieldResult.success || rootResult.success)
      throw new Error("expected failures");

    expect(
      Object.keys(validationDetails(fieldResult.error).fieldErrors),
    ).toEqual(["a", "b"]);
    expect(validationDetails(rootResult.error).formErrors).toHaveLength(1);
  });
});

describe("withApiErrorHandling", () => {
  it("passes successful responses through", async () => {
    const handler = withApiErrorHandling(async () =>
      Response.json({ ok: true }),
    );

    const response = await handler();

    expect(response.status).toBe(200);
  });

  it("answers 503 when the database is unavailable, without leaking internals", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApiErrorHandling(async () => {
      throw databaseUnavailableError();
    });

    const response = await handler();
    const body: unknown = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: API_MESSAGES.serviceUnavailable,
      },
    });
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    expect(log).toHaveBeenCalledOnce();
  });

  it.each([
    [
      "the database rejects the configured credentials",
      databaseAuthenticationError(),
    ],
    ["Prisma fails in a way it cannot classify", prismaUnknownRequestError()],
  ])(
    "answers 500, not 503, when %s (retrying would not help)",
    async (_label, error) => {
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      const handler = withApiErrorHandling(async () => {
        throw error;
      });

      const response = await handler();

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: { code: "INTERNAL_ERROR", message: API_MESSAGES.internalError },
      });
      expect(log).toHaveBeenCalledWith(expect.any(String), error);
    },
  );

  it("answers a generic 500 for anything else (a bug is not an outage)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApiErrorHandling(async () => {
      throw new TypeError("Cannot read properties of undefined (reading 'id')");
    });

    const response = await handler();
    const body: unknown = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: { code: "INTERNAL_ERROR", message: API_MESSAGES.internalError },
    });
    expect(JSON.stringify(body)).not.toContain("properties");
    expect(log).toHaveBeenCalledOnce();
  });

  it("lets Next.js control-flow errors (redirect, notFound) propagate", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const redirecting = withApiErrorHandling(async () => redirect("/login"));
    const missing = withApiErrorHandling(async () => notFound());

    await expect(redirecting()).rejects.toMatchObject({
      digest: expect.stringMatching(/^NEXT_REDIRECT/),
    });
    await expect(missing()).rejects.toMatchObject({
      digest: expect.stringMatching(/^NEXT_HTTP_ERROR_FALLBACK;404/),
    });
    expect(log).not.toHaveBeenCalled();
  });
});
