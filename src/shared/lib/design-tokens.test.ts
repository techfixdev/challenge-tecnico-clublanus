// @vitest-environment node
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildFigmaTokens,
  colorTokens,
  parseCustomProperties,
  parseShadow,
  resolveColor,
  serializeTokens,
  type ShadowLayer,
} from "./design-tokens";

const css = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);

describe("parseCustomProperties", () => {
  const sample = `
@theme {
  /* Brand red. */
  --color-a: #FF0000;
  --color-b: var(--color-a);

  --color-c: #00ff00;
}
@theme inline {
  --font-display: var(--font-arvo), serif;
}
.ignored {
  --color-z: #000000;
}
:root {
  /* Two tokens, one comment. */
  --motion-x: 10ms;
  --motion-y:
    20ms;
}`;

  it("collects declarations from @theme, @theme inline and :root blocks only", () => {
    const props = parseCustomProperties(sample);
    expect([...props.keys()]).toEqual([
      "--color-a",
      "--color-b",
      "--color-c",
      "--font-display",
      "--motion-x",
      "--motion-y",
    ]);
    expect(props.get("--motion-y")?.value).toBe("20ms");
  });

  it("attaches the nearest comment, shared until a blank line", () => {
    const props = parseCustomProperties(sample);
    expect(props.get("--color-a")?.comment).toBe("Brand red.");
    expect(props.get("--color-b")?.comment).toBe("Brand red.");
    expect(props.get("--color-c")?.comment).toBeUndefined();
    expect(props.get("--motion-y")?.comment).toBe("Two tokens, one comment.");
  });
});

describe("resolveColor", () => {
  const vars = new Map([
    ["--color-a", "#70192D"],
    ["--color-b", "var(--color-a)"],
    ["--color-loop", "var(--color-loop)"],
  ]);

  it("lowercases hex and follows var() chains", () => {
    expect(resolveColor("#70192D", vars)).toBe("#70192d");
    expect(resolveColor("var(--color-b)", vars)).toBe("#70192d");
  });

  it("turns rgb() with alpha into 8-digit hex", () => {
    expect(resolveColor("rgb(52 24 38 / 0.06)", vars)).toBe("#3418260f");
    expect(resolveColor("rgb(255 255 255)", vars)).toBe("#ffffff");
  });

  it("resolves color-mix() in srgb, against transparent and against a color", () => {
    // 24% of the color over transparent: the color itself at 24% alpha (0.24 × 255 ≈ 61).
    expect(
      resolveColor("color-mix(in srgb, var(--color-b) 24%, transparent)", vars),
    ).toBe("#70192d3d");
    // 25% granate over white (primary-soft's recipe).
    expect(resolveColor("color-mix(in srgb, #70192d 25%, white)", vars)).toBe(
      "#dbc6cb",
    );
  });

  it("throws on unknown references and cycles", () => {
    expect(() => resolveColor("var(--color-nope)", vars)).toThrow(/nope/);
    expect(() => resolveColor("var(--color-loop)", vars)).toThrow();
  });
});

describe("parseShadow", () => {
  it("splits layers and reads inset, offsets, blur, spread and color", () => {
    const vars = new Map([["--color-ink", "#352602"]]);
    expect(
      parseShadow(
        "inset 0 1px 0 rgb(255 255 255 / 0.55), 1px 6px 12px -6px color-mix(in srgb, var(--color-ink) 22%, transparent)",
        vars,
      ),
    ).toEqual([
      {
        inset: true,
        offsetX: "0px",
        offsetY: "1px",
        blur: "0px",
        spread: "0px",
        color: "#ffffff8c",
      },
      {
        inset: false,
        offsetX: "1px",
        offsetY: "6px",
        blur: "12px",
        spread: "-6px",
        color: "#35260238",
      },
    ]);
  });
});

describe("colorTokens (globals.css)", () => {
  it("resolves every color token to a final hex", () => {
    const colors = colorTokens(css);
    expect(colors.get("subscription")).toBe("#6f5c14");
    for (const hex of colors.values()) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("buildFigmaTokens (globals.css)", () => {
  const tokens = buildFigmaTokens(css);
  type Token = { $type: string; $value: unknown; $description: string };
  /** The token at a dotted path, e.g. `color.brand.gold.dark`. */
  const token = (path: string) =>
    path
      .split(".")
      .reduce<unknown>(
        (node, key) => (node as Record<string, unknown>)[key],
        tokens,
      ) as Token;
  const layers = (path: string) => token(path).$value as ShadowLayer[];

  it("groups brand colors by family, with their role as description", () => {
    expect(token("color.brand.garnet.base")).toMatchObject({
      $type: "color",
      $value: "#70192d",
    });
    expect(token("color.brand.garnet.base").$description).toMatch(
      /Pantone 188/,
    );
    expect(token("color.brand.gold.dark").$value).toBe("#6f5c14");
    expect(token("color.brand.cool-gray.soft").$value).toBe("#e6e6e7");
  });

  it("resolves role aliases to hex and names the alias in the description", () => {
    expect(token("color.role.subscription.base").$value).toBe("#6f5c14");
    expect(token("color.role.subscription.base").$description).toContain(
      "{color.brand.gold.dark}",
    );
    expect(token("color.role.danger.on-brand").$value).toBe("#ffb4ab");
  });

  it("exports every color token, each with a description", () => {
    const leaves: Array<{ $value: string; $description: string }> = [];
    const walk = (node: Record<string, unknown>) => {
      if ("$value" in node) leaves.push(node as (typeof leaves)[number]);
      else
        Object.values(node).forEach((child) =>
          walk(child as Record<string, unknown>),
        );
    };
    walk(tokens.color as Record<string, unknown>);
    expect(leaves).toHaveLength(colorTokens(css).size);
    for (const leaf of leaves)
      expect(leaf.$description.length).toBeGreaterThan(0);
  });

  it("exports the motion durations and the one curve", () => {
    expect(token("motion.duration.fast")).toMatchObject({
      $type: "duration",
      $value: "160ms",
    });
    expect(token("motion.duration.nav").$value).toBe("400ms");
    expect(token("motion.ease")).toMatchObject({
      $type: "cubicBezier",
      $value: [0.32, 0.72, 0, 1],
    });
  });

  it("exports shadows with resolved colors and the font families", () => {
    expect(token("shadow.drop.card").$type).toBe("shadow");
    expect(layers("shadow.drop.raised")[0].color).toBe("#470f1b3d");
    expect(layers("shadow.inset.recessed")[0].inset).toBe(true);
    expect(token("font.sans")).toMatchObject({
      $type: "fontFamily",
      $value: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
    });
  });
});

describe("serializeTokens", () => {
  it("sorts keys at every level and ends with a newline", () => {
    const a = serializeTokens({ b: { y: 1, x: 2 }, a: [{ d: 1, c: 2 }] });
    const b = serializeTokens({ a: [{ c: 2, d: 1 }], b: { x: 2, y: 1 } });
    expect(a).toBe(b);
    expect(a.endsWith("}\n")).toBe(true);
    expect(a.indexOf('"a"')).toBeLessThan(a.indexOf('"b"'));
    // Arrays keep their order (shadow layers, bezier points).
    expect(serializeTokens({ v: [3, 1, 2] })).toContain("3,\n");
  });
});
