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
    expect(isLanPreviewEnabled({ ...production })).toBe(false);
    expect(isLanPreviewEnabled({ ...production, [LAN_PREVIEW_ENV]: "" })).toBe(
      false,
    );
    expect(isLanPreviewEnabled({ ...production, [LAN_PREVIEW_ENV]: "0" })).toBe(
      false,
    );
  });

  it("is on only with the explicit opt-in in a production build", () => {
    expect(isLanPreviewEnabled({ ...production, [LAN_PREVIEW_ENV]: "1" })).toBe(
      true,
    );
  });

  it("is ignored outside production (dev cookies are never Secure anyway)", () => {
    expect(
      isLanPreviewEnabled({ NODE_ENV: "development", [LAN_PREVIEW_ENV]: "1" }),
    ).toBe(false);
    expect(
      isLanPreviewEnabled({ NODE_ENV: "test", [LAN_PREVIEW_ENV]: "1" }),
    ).toBe(false);
  });

  it("refuses to run on Vercel, whatever the environment", () => {
    for (const vercel of [{ VERCEL: "1" }, { VERCEL_ENV: "preview" }]) {
      expect(() =>
        isLanPreviewEnabled({
          ...production,
          ...vercel,
          [LAN_PREVIEW_ENV]: "1",
        }),
      ).toThrow(/Vercel/);
    }
    // Without the flag, Vercel is the normal deployment: nothing to refuse.
    expect(isLanPreviewEnabled({ ...production, VERCEL: "1" })).toBe(false);
  });

  it("refuses an ambiguous value instead of guessing", () => {
    expect(() =>
      isLanPreviewEnabled({ ...production, [LAN_PREVIEW_ENV]: "true" }),
    ).toThrow(/must be "1"/);
  });
});

describe("assertLanPreviewConfig", () => {
  it("warns loudly when the opt-in is on", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    assertLanPreviewConfig({ ...production, [LAN_PREVIEW_ENV]: "1" });

    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/NOT Secure/));
  });

  it("stays silent when it is off", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    assertLanPreviewConfig({ ...production });

    expect(warn).not.toHaveBeenCalled();
  });

  it("fails the build or the start on Vercel", () => {
    expect(() =>
      assertLanPreviewConfig({
        ...production,
        VERCEL: "1",
        [LAN_PREVIEW_ENV]: "1",
      }),
    ).toThrow(/Vercel/);
  });
});
