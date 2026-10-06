import { describe, expect, it } from "vitest";

import { isFlipTap, TAP_MAX_MS, TAP_SLOP_PX } from "./tap-guard";

const STILL = { dx: 0, dy: 0, cardShift: 0, elapsedMs: 120 };

describe("isFlipTap", () => {
  it("flips on a short press that stays in place", () => {
    expect(isFlipTap({ pointer: STILL })).toBe(true);
    expect(
      isFlipTap({ pointer: { ...STILL, dx: TAP_SLOP_PX - 1, dy: 3 } }),
    ).toBe(true);
  });

  it("always flips from the keyboard (Enter / Space)", () => {
    expect(isFlipTap({ keyboard: true })).toBe(true);
    expect(isFlipTap({ keyboard: true, pointer: { ...STILL, dx: 200 } })).toBe(
      true,
    );
  });

  it("does not flip after a horizontal swipe of the carousel", () => {
    expect(isFlipTap({ pointer: { ...STILL, dx: -60 } })).toBe(false);
  });

  it("does not flip when the carousel scrolled under a still finger", () => {
    expect(isFlipTap({ pointer: { ...STILL, cardShift: 40 } })).toBe(false);
  });

  it("does not flip after a tilt drag (the finger moved over the card)", () => {
    expect(isFlipTap({ pointer: { ...STILL, dx: 30, dy: -25 } })).toBe(false);
  });

  it("does not flip after a long press (looking at the tilt and sheen)", () => {
    expect(
      isFlipTap({ pointer: { ...STILL, elapsedMs: TAP_MAX_MS + 1 } }),
    ).toBe(false);
  });

  it("does not flip when the browser cancelled the pointer (it took over to scroll)", () => {
    expect(isFlipTap({ pointer: { ...STILL, cancelled: true } })).toBe(false);
  });

  it("flips on an activation without a recorded press (assistive technology click)", () => {
    expect(isFlipTap({})).toBe(true);
  });
});
