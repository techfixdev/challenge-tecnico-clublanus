// @vitest-environment node
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ESCUDO_PATHS, ESCUDO_VIEW_BOX } from "@/shared/ui/brand/escudo-vector";

/*
 * The app icon (favicon, "Add to Home Screen") is a file Next serves as is, so it cannot
 * import the shield: it is a copy. This keeps the copy the official vector, which
 * escudo-vector.test.ts in turn pins to public/brand/escudo.svg.
 */

const icon = readFileSync(new URL("./icon.svg", import.meta.url), "utf8");

describe("app icon (src/app/icon.svg)", () => {
  it("frames the shield with the official viewBox", () => {
    expect(icon).toContain(`viewBox="${ESCUDO_VIEW_BOX}"`);
  });

  it("draws exactly the official shield paths, in order and in the manual's colors", () => {
    const paths = [
      ...icon.matchAll(
        /<path (?:fill-rule="(\w+)" )?fill="([^"]+)" d="([^"]+)"/g,
      ),
    ].map(([, fillRule, fill, d]) => ({ fillRule, fill, d }));

    expect(paths).toEqual(ESCUDO_PATHS);
  });

  it("contains nothing but those paths (no extra shapes or styles)", () => {
    expect(icon.match(/<(?!\/)(\w+)/g)).toEqual([
      "<svg",
      ...ESCUDO_PATHS.map(() => "<path"),
    ]);
  });
});
