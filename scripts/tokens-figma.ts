import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { format } from "prettier";

import {
  buildFigmaTokens,
  serializeTokens,
} from "../src/shared/lib/design-tokens";

/*
 * Exports globals.css's design tokens as DTCG JSON for Figma (README → Figma):
 *
 *   pnpm tokens:figma           # (re)writes design/tokens.figma.json
 *   pnpm tokens:figma --check   # fails if the committed file is stale
 */

const CSS = "src/app/globals.css";
const OUTPUT = "design/tokens.figma.json";

/**
 * The tokens file `css` generates: keys sorted, then formatted by Prettier exactly as
 * `pnpm format` would, so formatting the repository never makes it stale.
 */
export async function renderTokensFile(css: string): Promise<string> {
  return format(serializeTokens(buildFigmaTokens(css)), { parser: "json" });
}

/** Whether a committed tokens file no longer matches what `css` generates. */
export async function isStale(
  committed: string,
  css: string,
): Promise<boolean> {
  return committed !== (await renderTokensFile(css));
}

async function main() {
  // Every entry point (pnpm scripts) runs from the repository root.
  const root = process.cwd();
  const css = readFileSync(path.join(root, CSS), "utf8");
  const output = path.join(root, OUTPUT);

  if (process.argv.includes("--check")) {
    let committed = "";
    try {
      committed = readFileSync(output, "utf8");
    } catch {
      // A missing file is as stale as an outdated one.
    }
    if (await isStale(committed, css)) {
      console.error(`${OUTPUT} is stale: run \`pnpm tokens:figma\`.`);
      process.exitCode = 1;
      return;
    }
    console.log(`${OUTPUT} is up to date.`);
    return;
  }

  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, await renderTokensFile(css));
  console.log(`Wrote ${OUTPUT}.`);
}

// Run only as `pnpm tokens:figma`, not when a test imports the helpers above.
if (process.argv[1]?.endsWith(path.join("scripts", "tokens-figma.ts"))) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
