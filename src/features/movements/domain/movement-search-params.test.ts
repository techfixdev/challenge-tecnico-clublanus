import { describe, expect, it } from "vitest";

import { buildMovementsHref } from "./movement-search-params";

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
