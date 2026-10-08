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

  it("paints with exactly the shield's colors: granate #70192D and white initials", () => {
    const fills = new Set(
      [...publicSvg("escudo.svg").matchAll(/fill="([^"]+)"/g)].map(
        ([, fill]) => fill,
      ),
    );
    expect(fills).toEqual(new Set(["#70192D", "#FFF"]));
  });
});
