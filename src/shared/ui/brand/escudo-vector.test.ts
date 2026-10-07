import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ESCUDO_PATHS, ESCUDO_VIEW_BOX } from "./escudo-vector";

/** public/brand, resolved from this file so the test passes from any working directory. */
const BRAND_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../public/brand",
);

const publicSvg = (name: string) => readFileSync(join(BRAND_DIR, name), "utf8");

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

  // The shield's own colors only: granate #70192D, white initials and stars, gold stars.
  it.each([
    ["escudo.svg", ["#70192D", "#FFF"]],
    ["escudo-estrellas-doradas.svg", ["#70192D", "#B4923A", "#FFF"]],
    ["escudo-estrellas-blancas.svg", ["#70192D", "#FFF"]],
  ])("%s paints with exactly the shield's colors %j", (name, colors) => {
    const fills = new Set(
      [...publicSvg(name).matchAll(/fill="([^"]+)"/g)].map(([, fill]) => fill),
    );
    expect(fills).toEqual(new Set(colors));
  });
});
