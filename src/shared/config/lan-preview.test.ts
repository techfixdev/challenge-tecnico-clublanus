import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LAN_PREVIEW_ENV,
  assertLanPreviewConfig,
  isLanPreviewEnabled,
} from "./lan-preview";

const production = { NODE_ENV: "production" } as const;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isLanPreviewEnabled", () => {
  it("is off by default", () => {
    expect(isLanPreviewEnabled({ env: { ...production } })).toBe(false);
    expect(
      isLanPreviewEnabled({ env: { ...production, [LAN_PREVIEW_ENV]: "" } }),
    ).toBe(false);
    expect(
      isLanPreviewEnabled({ env: { ...production, [LAN_PREVIEW_ENV]: "0" } }),
    ).toBe(false);
  });

  it("is on only with the explicit opt-in in a production build", () => {
    expect(
      isLanPreviewEnabled({ env: { ...production, [LAN_PREVIEW_ENV]: "1" } }),
    ).toBe(true);
  });

  it("is ignored outside production (dev cookies are never Secure anyway)", () => {
    expect(
      isLanPreviewEnabled({
        env: { NODE_ENV: "development", [LAN_PREVIEW_ENV]: "1" },
      }),
    ).toBe(false);
    expect(
      isLanPreviewEnabled({
        env: { NODE_ENV: "test", [LAN_PREVIEW_ENV]: "1" },
      }),
    ).toBe(false);
  });

  it("refuses to run on Vercel, whatever the environment", () => {
    for (const vercel of [{ VERCEL: "1" }, { VERCEL_ENV: "preview" }]) {
      expect(() =>
        isLanPreviewEnabled({
          env: {
            ...production,
            ...vercel,
            [LAN_PREVIEW_ENV]: "1",
          },
        }),
      ).toThrow(/Vercel/);
    }
    // Without the flag, Vercel is the normal deployment: nothing to refuse.
    expect(isLanPreviewEnabled({ env: { ...production, VERCEL: "1" } })).toBe(
      false,
    );
  });

  it("is truly ignored outside production: not even validated", () => {
    for (const env of [
      { NODE_ENV: "development", [LAN_PREVIEW_ENV]: "true" },
      { NODE_ENV: "development", VERCEL: "1", [LAN_PREVIEW_ENV]: "1" },
      { [LAN_PREVIEW_ENV]: "yes" },
    ]) {
      expect(isLanPreviewEnabled({ env })).toBe(false);
    }
  });

  it("takes the production decision from the caller when given", () => {
    // The caller's decision wins over NODE_ENV, in both directions.
    expect(
      isLanPreviewEnabled({
        env: { [LAN_PREVIEW_ENV]: "1" },
        isProduction: true,
      }),
    ).toBe(true);
    expect(
      isLanPreviewEnabled({
        env: { ...production, [LAN_PREVIEW_ENV]: "1" },
        isProduction: false,
      }),
    ).toBe(false);
    // Production by the caller's word is validated like any production.
    expect(() =>
      isLanPreviewEnabled({
        env: { [LAN_PREVIEW_ENV]: "true" },
        isProduction: true,
      }),
    ).toThrow(/must be "1"/);
  });

  it("refuses an ambiguous value instead of guessing", () => {
    expect(() =>
      isLanPreviewEnabled({
        env: { ...production, [LAN_PREVIEW_ENV]: "true" },
      }),
    ).toThrow(/must be "1"/);
  });
});

describe("assertLanPreviewConfig", () => {
  it("warns loudly when the opt-in is on", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    assertLanPreviewConfig({ env: { ...production, [LAN_PREVIEW_ENV]: "1" } });

    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/NOT Secure/));
  });

  it("stays silent and does not throw outside production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    assertLanPreviewConfig({
      env: { NODE_ENV: "development", [LAN_PREVIEW_ENV]: "true" },
    });

    expect(warn).not.toHaveBeenCalled();
  });

  it("stays silent when it is off", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    assertLanPreviewConfig({ env: { ...production } });

    expect(warn).not.toHaveBeenCalled();
  });

  it("fails the build or the start on Vercel", () => {
    expect(() =>
      assertLanPreviewConfig({
        env: {
          ...production,
          VERCEL: "1",
          [LAN_PREVIEW_ENV]: "1",
        },
      }),
    ).toThrow(/Vercel/);
  });
});
