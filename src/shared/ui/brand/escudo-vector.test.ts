import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ESCUDO_PATHS, ESCUDO_VIEW_BOX } from "./escudo-vector";

const publicSvg = (name: string) =>
  readFileSync(join(process.cwd(), "public/brand", name), "utf8");

describe("the club's shield", () => {
  it("inline copy is exactly the official vector in public/brand/escudo.svg", () => {
    const svg = publicSvg("escudo.svg");
    expect(svg).toContain(`viewBox="${ESCUDO_VIEW_BOX}"`);
    const paths = [
      ...svg.matchAll(
        /<path (?:fill-rule="(\w+)" )?fill="([^"]+)" d="([^"]+)"/g,
      ),
    ].map(([, fillRule, fill, d]) => ({ fillRule, fill, d }));
    expect(paths).toEqual(ESCUDO_PATHS);
  });

  it.each([
    "escudo.svg",
    "escudo-estrellas-doradas.svg",
    "escudo-estrellas-blancas.svg",
  ])(
    "%s keeps the manual's colors (granate #70192D, white initials)",
    (name) => {
      const fills = new Set(
        [...publicSvg(name).matchAll(/fill="([^"]+)"/g)].map(
          ([, fill]) => fill,
        ),
      );
      expect(fills.has("#70192D")).toBe(true);
      expect(fills.has("#FFF")).toBe(true);
      // Only the manual's colors: granate, white, and the gold of the gold stars.
      for (const fill of fills) {
        expect(["#70192D", "#FFF", "#B4923A"]).toContain(fill);
      }
    },
  );
});
