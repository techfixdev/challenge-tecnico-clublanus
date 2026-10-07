import { describe, expect, it } from "vitest";

import {
  INACTIVE_OPACITY,
  INACTIVE_SCALE,
  cardDistance,
  measureSnaps,
  nearestCard,
  opacityAt,
  scaleAt,
} from "./card-deck";

describe("card deck position math", () => {
  it("measures snaps from the first card and clamps them to the maximum offset", () => {
    // Two 287px cards with a 16px gap in a 390px phone: the last card rests 248px along.
    expect(measureSnaps([24, 327], 248)).toEqual([0, 248]);
    expect(measureSnaps([24, 327, 630], 551)).toEqual([0, 303, 551]);
  });

  it("is 0 for the resting card and grows to 1 a full card away", () => {
    const snaps = [0, 248];
    expect(cardDistance(0, snaps, 0)).toBe(0);
    expect(cardDistance(0, snaps, 1)).toBe(1);
    expect(cardDistance(124, snaps, 0)).toBeCloseTo(0.5);
    expect(cardDistance(124, snaps, 1)).toBeCloseTo(0.5);
    expect(cardDistance(248, snaps, 1)).toBe(0);
  });

  it("treats the first card as active before the carousel is measured (server render)", () => {
    expect(cardDistance(0, [], 0)).toBe(0);
    expect(cardDistance(0, [], 1)).toBe(1);
  });

  it("picks the card closest to the deck's offset", () => {
    expect(nearestCard(0, [0, 248])).toBe(0);
    expect(nearestCard(130, [0, 248])).toBe(1);
    expect(nearestCard(0, [])).toBe(0);
  });

  it("scales and dims non-active cards", () => {
    expect(scaleAt(0)).toBe(1);
    expect(scaleAt(1)).toBeCloseTo(INACTIVE_SCALE);
    expect(opacityAt(0)).toBe(1);
    expect(opacityAt(1)).toBeCloseTo(INACTIVE_OPACITY);
  });
});
