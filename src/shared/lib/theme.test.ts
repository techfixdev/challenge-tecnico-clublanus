// @vitest-environment node
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

import { APP_BACKGROUND_COLOR, LOGIN_THEME_COLOR } from "./theme";

describe("APP_BACKGROUND_COLOR", () => {
  it("matches the background token in globals.css (one source for the browser chrome)", () => {
    const css = readFileSync(
      new URL("../../app/globals.css", import.meta.url),
      "utf8",
    );

    expect(css).toContain(`--color-background: ${APP_BACKGROUND_COLOR};`);
  });

  it("is the manifest's theme and splash background", () => {
    expect(manifest()).toMatchObject({
      theme_color: APP_BACKGROUND_COLOR,
      background_color: APP_BACKGROUND_COLOR,
    });
  });
});

describe("LOGIN_THEME_COLOR", () => {
  it("is the official granate token in globals.css", () => {
    const css = readFileSync(
      new URL("../../app/globals.css", import.meta.url),
      "utf8",
    );

    expect(css).toContain(`--color-primary: ${LOGIN_THEME_COLOR};`);
  });
});
