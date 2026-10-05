// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
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

  it("turns unexpected failures into a 503 without leaking internals", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApiErrorHandling(async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:5432");
    });

    const response = await handler();
    const body: unknown = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: expect.any(String),
      },
    });
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    expect(log).toHaveBeenCalledOnce();
  });
});
