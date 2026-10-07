// @vitest-environment node
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/*
 * Guards the rule "only the Club Atlético Lanús brand manual palette": granate
 * (Pantone 188 C), gold (Pantone 618 C) and Cool Gray 7C, plus tints and shades of
 * them. Red for errors is the one documented exception (README → Brand).
 */

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

/** Every `--color-*` declaration in globals.css, with `var()` references resolved. */
function colorTokens(): Map<string, string> {
  const raw = new Map<string, string>();
  for (const [, name, value] of css.matchAll(
    /--color-([a-z0-9-]+):\s*([^;]+);/g,
  )) {
    raw.set(name, value.trim());
  }
  const resolve = (value: string, depth = 0): string => {
    const ref = /^var\(--color-([a-z0-9-]+)\)$/.exec(value);
    if (!ref) return value.toLowerCase();
    const target = raw.get(ref[1]);
    if (target === undefined || depth > 8) {
      throw new Error(`Unresolvable color reference: ${value}`);
    }
    return resolve(target, depth + 1);
  };
  return new Map([...raw].map(([name, value]) => [name, resolve(value)]));
}

const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const linear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

/** WCAG 2.x relative luminance contrast ratio. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = channels(hex).map(linear);
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** OKLCH chroma and hue (degrees) of an sRGB hex color. */
function chromaHue(hex: string): { chroma: number; hue: number } {
  const [r, g, b] = channels(hex).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {
    chroma: Math.hypot(a, bb),
    hue: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360,
  };
}

const hueDistance = (x: number, y: number) => {
  const d = Math.abs(x - y) % 360;
  return d > 180 ? 360 - d : d;
};

const GRANATE = "#70192d";
const GOLD = "#b4982f";
const COOL_GRAY = "#9a999d";

/**
 * Allowlist: every color token and its only accepted value. Each one is an official
 * brand color or a tint/shade of one (see the comments in globals.css); the `danger*`
 * family is the documented accessibility exception.
 */
const ALLOWLIST: Record<string, string> = {
  primary: GRANATE,
  "primary-soft": "#dbc6ca",
  "primary-dark": "#470f1b",
  "primary-deep": "#3a0d18",
  "primary-glow": "#7e1f34",
  gold: GOLD,
  "gold-light": "#fae7b3",
  "gold-bright": "#e6bf5d",
  "gold-soft": "#ece5cb",
  "gold-dark": "#6f5c14",
  "gold-ink": "#352602",
  "cool-gray": COOL_GRAY,
  "cool-gray-soft": "#e6e6e7",
  "cool-gray-dark": "#5e5d61",
  "card-pink": "#f5c3c7",
  "card-pink-glow": "#c86e78",
  "card-stripe": "#120a0c",
  "card-stripe-edge": "#2c1b1f",
  "card-stripe-low": "#1d1215",
  "card-signature": "#f8f5ed",
  "card-signature-line": "#e9e5d6",
  "card-signature-ink": "#3b2a2e",
  "card-cvv-ink": "#1b1416",
  background: "#f9f9fa",
  surface: "#ffffff",
  foreground: "#1b1a1d",
  muted: "#727174",
  border: "#ebebed",
  subscription: "#6f5c14",
  "subscription-soft": "#ece5cb",
  received: GRANATE,
  "received-soft": "#dbc6ca",
  sent: "#5e5d61",
  "sent-soft": "#e6e6e7",
  danger: "#b32d32",
  "danger-soft": "#f7eaeb",
  "danger-on-brand": "#ffb4ab",
  success: GRANATE,
  "success-soft": "#dbc6ca",
  warning: "#6f5c14",
  "warning-soft": "#fae7b3",
  skeleton: "#ebebed",
};

/** The accessibility exception: errors stay red so they read as errors. */
const isDangerException = (name: string) => name.startsWith("danger");

describe("brand palette (globals.css)", () => {
  const tokens = colorTokens();

  it("declares exactly the allowlisted color tokens, with their brand-derived values", () => {
    expect(Object.fromEntries(tokens)).toEqual(ALLOWLIST);
  });

  it("keeps every non-exception token on a brand hue (granate or gold) or neutral Cool Gray", () => {
    const granateHue = chromaHue(GRANATE).hue;
    const goldHue = chromaHue(GOLD).hue;
    // Cool Gray 7C has OKLCH chroma ~0.006: below this a color reads as neutral grey.
    const NEUTRAL_CHROMA = 0.008;

    const offBrand = [...tokens]
      .filter(([name]) => !isDangerException(name))
      .filter(([, hex]) => {
        const { chroma, hue } = chromaHue(hex);
        if (chroma <= NEUTRAL_CHROMA) return false;
        return (
          hueDistance(hue, granateHue) > 15 && hueDistance(hue, goldHue) > 10
        );
      })
      .map(([name, hex]) => `${name} ${hex}`);

    expect(offBrand).toEqual([]);
  });

  it("keeps the red exception clearly apart from granate", () => {
    const danger = tokens.get("danger")!;
    expect(contrast(danger, GRANATE)).toBeGreaterThanOrEqual(1.5);
    expect(
      hueDistance(chromaHue(danger).hue, chromaHue(GRANATE).hue),
    ).toBeLessThanOrEqual(15);
  });

  it.each([
    ["subscription", "subscription-soft"],
    ["subscription", "surface"],
    ["subscription", "background"],
    ["sent", "sent-soft"],
    ["sent", "surface"],
    ["sent", "background"],
    ["received", "received-soft"],
    ["received", "surface"],
    ["success", "success-soft"],
    ["warning", "warning-soft"],
    ["danger", "danger-soft"],
    ["danger", "surface"],
    ["danger", "background"],
    ["danger-on-brand", "primary"],
    ["danger-on-brand", "primary-glow"],
    ["foreground", "background"],
    ["foreground", "surface"],
    ["muted", "background"],
    ["muted", "surface"],
  ])("%s text on %s reaches WCAG AA (4.5:1)", (text, surface) => {
    expect(
      contrast(tokens.get(text)!, tokens.get(surface)!),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
