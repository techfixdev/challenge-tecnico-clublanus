/*
 * Reads the design tokens declared in globals.css (`@theme`, `@theme inline` and `:root`)
 * and turns them into a Design Tokens Community Group (DTCG) JSON tree that Figma imports
 * as variables and styles (README → Figma). Pure: no file system, so the brand palette
 * test and `pnpm tokens:figma` share it.
 */

export type CustomProperty = { value: string; comment?: string };

/** A DTCG token or group. */
export type TokenTree = { [key: string]: TokenTree | unknown };

export type ShadowLayer = {
  inset: boolean;
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string;
};

const BLOCK_START = /^(?:@theme(?: inline)?|:root)\s*\{/gm;
const ITEM = /(\s*)(?:\/\*([\s\S]*?)\*\/|(--[a-z0-9-]+)\s*:\s*([^;]+);)/y;

/** The body of the block whose `{` is at `open`, braces balanced. */
function blockBody(css: string, open: number): string {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error("Unterminated CSS block");
}

const cleanComment = (text: string) =>
  text
    .replace(/^\s*\*\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Every custom property declared at the top of `@theme`, `@theme inline` and `:root`
 * blocks (not inside other selectors), in source order. Each one carries the nearest
 * comment above it: a comment covers the declarations that follow it until a blank line.
 */
export function parseCustomProperties(
  css: string,
): Map<string, CustomProperty> {
  const props = new Map<string, CustomProperty>();
  for (const match of css.matchAll(BLOCK_START)) {
    const body = blockBody(css, match.index + match[0].length - 1);
    let comment: string | undefined;
    for (let at = 0; at < body.length; at = ITEM.lastIndex) {
      ITEM.lastIndex = at;
      const item = ITEM.exec(body);
      if (!item) {
        if (body.slice(at).trim() === "") break;
        throw new Error(
          `Unexpected CSS in a token block: ${body.slice(at, at + 60).trim()}`,
        );
      }
      const [, space, commentText, name, value] = item;
      if (/\n[ \t]*\n/.test(space)) comment = undefined;
      if (commentText !== undefined) {
        comment = cleanComment(commentText);
      } else {
        props.set(name, {
          value: value.replace(/\s+/g, " ").trim(),
          ...(comment ? { comment } : {}),
        });
      }
    }
  }
  return props;
}

/* ---------------------------------------------------------------- colors */

type Rgba = [number, number, number, number]; // 0–255 channels, 0–1 alpha

const NAMED: Record<string, Rgba> = {
  transparent: [0, 0, 0, 0],
  white: [255, 255, 255, 1],
  black: [0, 0, 0, 1],
};

/** Splits on commas (or whitespace) outside parentheses. */
function splitTopLevel(value: string, separator: "," | " "): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    const splits = separator === "," ? char === "," : /\s/.test(char);
    if (splits && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseRgba(
  value: string,
  vars: ReadonlyMap<string, string>,
  depth: number,
): Rgba {
  if (depth > 16) throw new Error(`Color reference cycle at ${value}`);
  const v = value.trim().toLowerCase();

  const ref = /^var\((--[a-z0-9-]+)\)$/.exec(v);
  if (ref) {
    const target = vars.get(ref[1]);
    if (target === undefined) {
      throw new Error(`Unresolvable color reference: ${value}`);
    }
    return parseRgba(target, vars, depth + 1);
  }

  if (v in NAMED) return NAMED[v];

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(v);
  if (hex) {
    const digits =
      hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join("") : hex[1];
    const [r, g, b, a = 255] = [0, 2, 4, 6]
      .filter((i) => i < digits.length)
      .map((i) => parseInt(digits.slice(i, i + 2), 16));
    return [r, g, b, a / 255];
  }

  const rgb =
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[/,]\s*([\d.]+%?))?\s*\)$/.exec(
      v,
    );
  if (rgb) {
    const alpha = rgb[4] === undefined ? 1 : percentOrNumber(rgb[4]);
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), alpha];
  }

  const mix = /^color-mix\(\s*in srgb\s*,(.*)\)$/.exec(v);
  if (mix) {
    const [first, second] = splitTopLevel(mix[1], ",").map(parseMixComponent);
    if (!first || !second) throw new Error(`Malformed color-mix(): ${value}`);
    const { firstShare, alphaMultiplier } = mixShares(
      first.share,
      second.share,
      value,
    );
    const [r, g, b, a] = mixSrgb(
      parseRgba(first.color, vars, depth + 1),
      firstShare,
      parseRgba(second.color, vars, depth + 1),
    );
    return [r, g, b, a * alphaMultiplier];
  }

  throw new Error(`Unsupported color value: ${value}`);
}

const percentOrNumber = (raw: string) =>
  raw.endsWith("%") ? parseFloat(raw) / 100 : Number(raw);

/** One `color [percentage]` argument of color-mix(); the share is 0–1 when given. */
function parseMixComponent(argument: string): {
  color: string;
  share: number | undefined;
} {
  const pieces = splitTopLevel(argument, " ");
  const percentage = pieces.find((piece) => /^[\d.]+%$/.test(piece));
  return {
    color: pieces.filter((piece) => piece !== percentage).join(" "),
    share: percentage === undefined ? undefined : parseFloat(percentage) / 100,
  };
}

/**
 * color-mix()'s percentage normalization (CSS Color 5, §2.1): a missing percentage is
 * what the other leaves of 100%; two that do not sum to 100% are scaled to it, and when
 * they sum to less, the shortfall becomes transparency (`alphaMultiplier`).
 */
function mixShares(
  first: number | undefined,
  second: number | undefined,
  value: string,
): { firstShare: number; alphaMultiplier: number } {
  const p1 = first ?? (second === undefined ? 0.5 : 1 - second);
  const p2 = second ?? 1 - p1;
  const total = p1 + p2;
  const isInRange = (share: number) => share >= 0 && share <= 1;
  if (!isInRange(p1) || !isInRange(p2) || total === 0) {
    throw new Error(`Invalid color-mix() percentages: ${value}`);
  }
  return { firstShare: p1 / total, alphaMultiplier: Math.min(1, total) };
}

/** CSS color-mix() in sRGB: premultiplied-alpha interpolation, `p` of the first color. */
function mixSrgb(a: Rgba, p: number, b: Rgba): Rgba {
  const alpha = a[3] * p + b[3] * (1 - p);
  if (alpha === 0) return [0, 0, 0, 0];
  const channel = (i: 0 | 1 | 2) =>
    (a[i] * a[3] * p + b[i] * b[3] * (1 - p)) / alpha;
  return [channel(0), channel(1), channel(2), alpha];
}

const byte = (n: number) =>
  Math.min(255, Math.max(0, Math.round(n)))
    .toString(16)
    .padStart(2, "0");

/**
 * Any color the tokens use (hex, `rgb()`, `var()` references, `color-mix()` in sRGB) as
 * its final lowercase hex: `#rrggbb` when opaque, `#rrggbbaa` otherwise. `vars` maps
 * custom property names (with `--`) to their raw values.
 */
export function resolveColor(
  value: string,
  vars: ReadonlyMap<string, string>,
): string {
  const [r, g, b, a] = parseRgba(value, vars, 0);
  const hex = `#${byte(r)}${byte(g)}${byte(b)}`;
  return a >= 1 ? hex : `${hex}${byte(a * 255)}`;
}

const rawValues = (props: Map<string, CustomProperty>) =>
  new Map([...props].map(([name, { value }]) => [name, value]));

/** Every `--color-*` token in globals.css (name without the prefix) → its final hex. */
export function colorTokens(css: string): Map<string, string> {
  const props = parseCustomProperties(css);
  const vars = rawValues(props);
  return new Map(
    [...props.keys()]
      .filter((name) => name.startsWith("--color-"))
      .map((name) => [
        name.slice("--color-".length),
        resolveColor(`var(${name})`, vars),
      ]),
  );
}

/* --------------------------------------------------------------- shadows */

const LENGTH = /^-?(?:\d*\.)?\d+(?:px|rem|em)?$/;
const px = (raw: string) => (/^-?(?:\d*\.)?\d+$/.test(raw) ? `${raw}px` : raw);

/** A CSS `box-shadow` value as DTCG shadow layers, colors resolved to hex. */
export function parseShadow(
  value: string,
  vars: ReadonlyMap<string, string>,
): ShadowLayer[] {
  return splitTopLevel(value, ",").map((layer) => {
    const parts = splitTopLevel(layer, " ");
    const inset = parts.includes("inset");
    const lengths = parts.filter((p) => LENGTH.test(p));
    const color = parts.filter((p) => p !== "inset" && !LENGTH.test(p));
    if (lengths.length < 2 || lengths.length > 4 || color.length !== 1) {
      throw new Error(`Unsupported shadow layer: ${layer}`);
    }
    const [offsetX, offsetY, blur = "0", spread = "0"] = lengths.map(px);
    return {
      inset,
      offsetX,
      offsetY,
      blur: px(blur),
      spread: px(spread),
      color: resolveColor(color[0], vars),
    };
  });
}

/* ----------------------------------------------------------- DTCG export */

/** Where each color token sits in the Figma tree (path under `color`). */
function colorPath(name: string): string[] {
  const families: Array<[prefix: string, group: string[]]> = [
    ["primary", ["brand", "garnet"]],
    ["cool-gray", ["brand", "cool-gray"]],
    ["gold", ["brand", "gold"]],
  ];
  for (const [prefix, group] of families) {
    if (name === prefix) return [...group, "base"];
    if (name.startsWith(`${prefix}-`)) {
      return [...group, name.slice(prefix.length + 1)];
    }
  }
  const role =
    /^(subscription|received|sent|success|warning|danger)(?:-(.+))?$/.exec(
      name,
    );
  if (role) return ["role", role[1], role[2] ?? "base"];
  if (name.startsWith("card-")) return ["card", name.slice("card-".length)];
  if (
    [
      "background",
      "surface",
      "foreground",
      "muted",
      "border",
      "skeleton",
    ].includes(name)
  ) {
    return ["neutral", name];
  }
  throw new Error(
    `No Figma group for --color-${name}: add it to colorPath() in design-tokens.ts`,
  );
}

/** next/font families, which globals.css only knows by their CSS variable. */
const NEXT_FONTS: Record<string, string> = {
  "--font-poppins": "Poppins",
  "--font-rokkitt": "Rokkitt",
};

const MOTION_DURATIONS: Record<string, string[]> = {
  "--motion-duration-fast": ["duration", "fast"],
  "--motion-duration-base": ["duration", "base"],
  "--motion-duration-nav": ["duration", "nav"],
  "--motion-stagger-step": ["rhythm", "stagger-step"],
  "--motion-shimmer-period": ["rhythm", "shimmer-period"],
};

function setPath(tree: TokenTree, path: string[], token: unknown): void {
  let node = tree;
  for (const key of path.slice(0, -1)) {
    node = (node[key] ??= {}) as TokenTree;
  }
  node[path[path.length - 1]] = token;
}

const describe = (comment: string | undefined, fallback: string) =>
  comment ?? fallback;

/** globals.css's tokens as a DTCG tree: colors, shadows, fonts and motion. */
export function buildFigmaTokens(css: string): TokenTree {
  const props = parseCustomProperties(css);
  const vars = rawValues(props);
  const tree: TokenTree = {};
  const colorPaths = new Map<string, string[]>();

  for (const name of props.keys()) {
    if (name.startsWith("--color-")) {
      colorPaths.set(name, [
        "color",
        ...colorPath(name.slice("--color-".length)),
      ]);
    }
  }

  for (const [name, { value, comment }] of props) {
    if (colorPaths.has(name)) {
      const path = colorPaths.get(name)!;
      const alias = /^var\((--color-[a-z0-9-]+)\)$/.exec(value);
      const aliasNote = alias
        ? `Alias of {${colorPaths.get(alias[1])!.join(".")}}.`
        : undefined;
      setPath(tree, path, {
        $type: "color",
        $value: resolveColor(value, vars),
        $description:
          [comment, aliasNote].filter(Boolean).join(" ") ||
          `${path.slice(1).join(" ")} (${name})`,
      });
    } else if (
      name.startsWith("--shadow-") ||
      name.startsWith("--inset-shadow-")
    ) {
      const inset = name.startsWith("--inset-");
      const key = name.replace(/^--(?:inset-)?shadow-/, "");
      setPath(tree, ["shadow", inset ? "inset" : "drop", key], {
        $type: "shadow",
        $value: parseShadow(value, vars),
        $description: describe(
          comment,
          `${inset ? "Inset" : "Drop"} shadow ${key}.`,
        ),
      });
    } else if (name.startsWith("--font-")) {
      const families = splitTopLevel(value, ",").map((family) => {
        const ref = /^var\((--[a-z0-9-]+)\)$/.exec(family);
        if (!ref) return family.replace(/^["']|["']$/g, "");
        const font = NEXT_FONTS[ref[1]];
        if (!font) throw new Error(`Unknown next/font variable ${ref[1]}`);
        return font;
      });
      setPath(tree, ["font", name.slice("--font-".length)], {
        $type: "fontFamily",
        $value: families,
        $description: describe(comment, `Font family (${name}).`),
      });
    } else if (name in MOTION_DURATIONS) {
      setPath(tree, ["motion", ...MOTION_DURATIONS[name]], {
        $type: "duration",
        $value: value,
        $description: describe(comment, `Motion ${name.slice(9)}.`),
      });
    } else if (name === "--motion-ease") {
      const points = /^cubic-bezier\(([^)]+)\)$/.exec(value);
      if (!points)
        throw new Error(`--motion-ease is not a cubic-bezier: ${value}`);
      setPath(tree, ["motion", "ease"], {
        $type: "cubicBezier",
        $value: points[1].split(",").map(Number),
        $description: describe(comment, "The one easing curve."),
      });
    }
  }
  return tree;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

/** Deterministic JSON: keys sorted at every level, two-space indent, trailing newline. */
export function serializeTokens(tree: unknown): string {
  return `${JSON.stringify(sortKeys(tree), null, 2)}\n`;
}
