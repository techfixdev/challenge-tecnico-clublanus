import { describe, expect, it } from "vitest";

import {
  SEARCH_MAX_LENGTH,
  buildMovementsHref,
  detailBackHref,
  parseMovementFilters,
  parseMovementListParams,
} from "./movement-filters";

describe("parseMovementFilters (page search params, lenient)", () => {
  it("maps readable URL slugs to movement types", () => {
    expect(parseMovementFilters({ type: "debito" })).toEqual({
      type: "SUBSCRIPTION",
    });
    expect(parseMovementFilters({ type: "recibido" })).toEqual({
      type: "RECEIVED",
    });
    expect(parseMovementFilters({ type: "enviado" })).toEqual({
      type: "SENT",
    });
  });

  it("trims the search query and drops it when blank", () => {
    expect(parseMovementFilters({ q: "  adobe  " })).toEqual({
      query: "adobe",
    });
    expect(parseMovementFilters({ q: "   " })).toEqual({});
  });

  it("combines search and type", () => {
    expect(parseMovementFilters({ q: "juan", type: "enviado" })).toEqual({
      query: "juan",
      type: "SENT",
    });
  });

  it("ignores invalid values instead of failing (falls back to all movements)", () => {
    expect(parseMovementFilters({ type: "SENT" })).toEqual({});
    expect(parseMovementFilters({ type: "anything" })).toEqual({});
    expect(
      parseMovementFilters({ q: "x".repeat(SEARCH_MAX_LENGTH + 1) }),
    ).toEqual({});
    // An invalid type does not discard a valid query.
    expect(parseMovementFilters({ q: "adobe", type: "nope" })).toEqual({
      query: "adobe",
    });
  });

  it("uses the first value when a param is repeated", () => {
    expect(
      parseMovementFilters({ q: ["adobe", "figma"], type: ["recibido"] }),
    ).toEqual({ query: "adobe", type: "RECEIVED" });
  });

  it("accepts a query of exactly the maximum length", () => {
    const query = "x".repeat(SEARCH_MAX_LENGTH);
    expect(parseMovementFilters({ q: query })).toEqual({ query });
  });
});

describe("parseMovementListParams (REST API, strict)", () => {
  it("parses q, type and an opaque cursor", () => {
    const cursor = Buffer.from(
      JSON.stringify({ t: "2026-10-01T12:00:00.000Z", id: "abc" }),
    ).toString("base64url");
    const result = parseMovementListParams(
      new URLSearchParams({ q: " adobe ", type: "debito", cursor }),
    );

    expect(result).toEqual({
      success: true,
      data: {
        filters: { query: "adobe", type: "SUBSCRIPTION" },
        cursor: { occurredAt: new Date("2026-10-01T12:00:00.000Z"), id: "abc" },
      },
    });
  });

  it("accepts no params at all", () => {
    expect(parseMovementListParams(new URLSearchParams())).toEqual({
      success: true,
      data: { filters: {}, cursor: undefined },
    });
  });

  it("rejects invalid params with field errors", () => {
    const result = parseMovementListParams(
      new URLSearchParams({
        type: "SENT",
        q: "x".repeat(SEARCH_MAX_LENGTH + 1),
        cursor: "not-a-cursor",
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(result.fieldErrors).sort()).toEqual([
      "cursor",
      "q",
      "type",
    ]);
  });
});

describe("buildMovementsHref", () => {
  it("returns the bare list URL without filters", () => {
    expect(buildMovementsHref({})).toBe("/movimientos");
  });

  it("serializes filters with readable slugs", () => {
    expect(buildMovementsHref({ query: "juan perez", type: "RECEIVED" })).toBe(
      "/movimientos?q=juan+perez&type=recibido",
    );
    expect(buildMovementsHref({ type: "SUBSCRIPTION" })).toBe(
      "/movimientos?type=debito",
    );
  });
});

describe("detailBackHref", () => {
  it("returns to the list with the filters the detail was opened from", () => {
    expect(detailBackHref({ q: "adobe", type: "debito" })).toBe(
      "/movimientos?q=adobe&type=debito",
    );
    expect(detailBackHref({})).toBe("/movimientos");
  });

  it("returns Home when the detail was opened from Home", () => {
    expect(detailBackHref({ from: "home" })).toBe("/");
  });

  it("ignores tampered values", () => {
    expect(detailBackHref({ from: "https://evil.example", type: "x" })).toBe(
      "/movimientos",
    );
  });
});
