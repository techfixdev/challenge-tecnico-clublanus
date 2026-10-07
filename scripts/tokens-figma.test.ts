// @vitest-environment node
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { isStale, renderTokensFile } from "./tokens-figma";

const css = readFileSync(
  new URL("../src/app/globals.css", import.meta.url),
  "utf8",
);

describe("pnpm tokens:figma", () => {
  it("renders the same file twice (deterministic), Prettier-formatted with a trailing newline", async () => {
    const first = await renderTokensFile(css);
    expect(await renderTokensFile(css)).toBe(first);
    expect(first.endsWith("}\n")).toBe(true);
    // Prettier keeps short arrays on one line: `pnpm format` never rewrites the file.
    expect(first).toContain('"$value": [0.32, 0.72, 0, 1]');
  });

  it("keeps design/tokens.figma.json up to date with globals.css (run `pnpm tokens:figma`)", async () => {
    const committed = readFileSync(
      new URL("../design/tokens.figma.json", import.meta.url),
      "utf8",
    );
    expect(await isStale(committed, css)).toBe(false);
  });

  it("reports the file stale when a token changes in globals.css", async () => {
    const fresh = await renderTokensFile(css);
    const edited = css.replace(
      "--color-primary: #70192d",
      "--color-primary: #70192e",
    );
    expect(await isStale(fresh, css)).toBe(false);
    expect(await isStale(fresh, edited)).toBe(true);
    expect(await isStale("", css)).toBe(true);
  });
});
