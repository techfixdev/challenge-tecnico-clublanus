import { describe, expect, it } from "vitest";

import { entranceTime } from "./home-entrance";

// The intro's dissolve starts 420ms into its timeline and Home's entrance with it.
const DELAY = 420;

describe("entranceTime: where Home's entrance stands, given the intro", () => {
  it("follows the intro's dissolve while it is still to come or running", () => {
    expect(
      entranceTime(100, { currentTime: 420, delay: DELAY, finished: false }),
    ).toBe(420);
    expect(
      entranceTime(500, { currentTime: 300, delay: DELAY, finished: false }),
    ).toBe(300);
  });

  it("starts at once when the intro is already gone (Home streamed in after it)", () => {
    expect(
      entranceTime(80, { currentTime: 900, delay: DELAY, finished: true }),
    ).toBe(DELAY);
  });

  it("never rewinds an entrance that is already past the hand-off", () => {
    expect(
      entranceTime(610, { currentTime: 900, delay: DELAY, finished: true }),
    ).toBe(610);
  });

  it("keeps its own timeline when there is no dissolve to follow", () => {
    expect(entranceTime(42, null)).toBe(42);
  });
});
