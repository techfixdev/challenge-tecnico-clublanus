import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { DURATION, DURATION_S, EASE, EASE_CSS } from "./tokens";

const SRC = join(process.cwd(), "src");
const css = readFileSync(join(SRC, "app/globals.css"), "utf8");

/** Source files (no tests), relative to src/. */
function sourceFiles(dir = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [relative(SRC, path)]
      : [];
  });
}

/**
 * Files that still hold their own timing, each with the reason. Everything else takes
 * its motion from tokens.ts and springs.ts.
 */
const OWN_TIMING = new Set([
  "shared/ui/motion/tokens.ts",
  "shared/ui/motion/springs.ts",
  // The transfer steps' slide: owned by the transfer-flow work, outside this pass.
  "features/transfers/ui/TransferFlow.tsx",
]);

/** Every `--motion-*` custom property declared in globals.css, name → value. */
function motionProperties() {
  return new Map(
    Array.from(css.matchAll(/(--motion-[\w-]+):\s*([^;]+);/g), (match) => [
      match[1]!,
      match[2]!.trim(),
    ]),
  );
}

/** Body of each `@keyframes` block, by name. */
function keyframes() {
  const blocks = new Map<string, string>();
  for (const match of css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    let depth = 1;
    let index = match.index! + match[0].length;
    const start = index;
    while (depth > 0 && index < css.length) {
      if (css[index] === "{") depth += 1;
      if (css[index] === "}") depth -= 1;
      index += 1;
    }
    blocks.set(match[1]!, css.slice(start, index - 1));
  }
  return blocks;
}

/** Declarations of the rule whose selector list contains `selector`. */
function ruleFor(selector: string) {
  const start = css.indexOf(selector);
  if (start === -1) return undefined;
  const open = css.indexOf("{", start);
  return css.slice(open + 1, css.indexOf("}", open));
}

describe("motion tokens", () => {
  it("has exactly three durations: fast, base and nav", () => {
    expect(DURATION).toEqual({ fast: 160, base: 280, nav: 400 });
    expect(DURATION_S).toEqual({ fast: 0.16, base: 0.28, nav: 0.4 });
  });

  it("has one curve, the iOS sheet curve", () => {
    expect(EASE).toEqual([0.32, 0.72, 0, 1]);
    expect(EASE_CSS).toBe("cubic-bezier(0.32, 0.72, 0, 1)");
  });

  it("declares the same tokens in globals.css, and no other duration or curve", () => {
    const properties = motionProperties();
    expect(properties.get("--motion-duration-fast")).toBe("160ms");
    expect(properties.get("--motion-duration-base")).toBe("280ms");
    expect(properties.get("--motion-duration-nav")).toBe("400ms");
    expect(properties.get("--motion-ease")).toBe(EASE_CSS);

    const durationTokens = [...properties.keys()].filter((name) =>
      name.startsWith("--motion-duration-"),
    );
    expect(durationTokens.sort()).toEqual([
      "--motion-duration-base",
      "--motion-duration-fast",
      "--motion-duration-nav",
    ]);
    expect(css.match(/cubic-bezier\(/g)).toHaveLength(1);
  });

  it("never writes a raw time in an animation or transition: tokens only", () => {
    const declarations = Array.from(
      css.matchAll(/^\s*(animation|transition)[\w-]*:\s*([^;]+);/gm),
      (match) => match[2]!,
    );
    expect(declarations.length).toBeGreaterThan(0);
    for (const value of declarations) {
      // `0s` is the reduced-motion override, the only literal allowed.
      expect(value.replace(/\b0s\b/g, "")).not.toMatch(/\d(ms|s)\b/);
    }
  });

  it("keeps every JS animation on the shared tokens: no local springs, curves or times", () => {
    const offenders = sourceFiles()
      .filter((file) => !OWN_TIMING.has(file))
      .filter((file) =>
        /stiffness:|damping:|ease: *\[|ease: *"|duration: *\d/.test(
          readFileSync(join(SRC, file), "utf8"),
        ),
      );
    expect(offenders).toEqual([]);
  });

  it("only reads --motion-* properties that globals.css declares", () => {
    const declared = new Set(motionProperties().keys());
    const files = ["app/globals.css", ...sourceFiles()];
    const dangling = files.flatMap((file) =>
      Array.from(
        readFileSync(join(SRC, file), "utf8").matchAll(
          /var\((--motion-[\w-]+)/g,
        ),
        (match) => match[1]!,
      )
        .filter((name) => !declared.has(name))
        .map((name) => `${file}: ${name}`),
    );
    expect(dangling).toEqual([]);
  });

  it("never blurs inside an animation (opacity and a short translate only)", () => {
    for (const [name, body] of keyframes()) {
      expect(body, `@keyframes ${name}`).not.toMatch(/blur\(/);
    }
  });

  it("rises at most 4px when content reveals", () => {
    expect(motionProperties().get("--motion-reveal-rise")).toBe("4px");
  });

  it("switches tabs instantly: no animation on either screen", () => {
    expect(ruleFor("::view-transition-new(.nav-tab-in)")).toMatch(
      /animation:\s*none/,
    );
    expect(ruleFor("::view-transition-old(.nav-tab-out)")).toMatch(
      /display:\s*none/,
    );
    expect(keyframes().has("nav-tab-in")).toBe(false);
  });
});
