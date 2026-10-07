import { describe, expect, it } from "vitest";

import {
  projectRelease,
  rubberBand,
  snapIndex,
  withEdgeResistance,
} from "./drag-snap";

const CARD = 100;

describe("projectRelease", () => {
  it("stays where the finger let go when the finger was still", () => {
    expect(projectRelease(-140, 0)).toBe(-140);
  });

  it("carries a release forward in the direction of the finger", () => {
    expect(projectRelease(0, -1000)).toBeLessThan(-50);
    expect(projectRelease(0, 1000)).toBeGreaterThan(50);
    // A fast flick of 1000px/s travels about one card, not a whole list.
    expect(Math.abs(projectRelease(0, 1000))).toBeLessThan(150);
  });
});

describe("snapIndex", () => {
  it("snaps a still release to the nearest card", () => {
    expect(snapIndex(0, 0, CARD, 4)).toBe(0);
    expect(snapIndex(-140, 0, CARD, 4)).toBe(1);
    expect(snapIndex(-160, 0, CARD, 4)).toBe(2);
  });

  it("lets a flick carry past the nearest card", () => {
    // Released 30% of the way to the next card, but moving fast towards it.
    expect(snapIndex(-30, -1000, CARD, 4)).toBe(1);
    // The same position flicked back lands on the first card.
    expect(snapIndex(-130, 1000, CARD, 4)).toBe(0);
  });

  it("never snaps outside the cards", () => {
    expect(snapIndex(80, 2000, CARD, 4)).toBe(0);
    expect(snapIndex(-900, -2000, CARD, 4)).toBe(3);
    expect(snapIndex(-300, 0, CARD, 1)).toBe(0);
    expect(snapIndex(-300, 0, CARD, 0)).toBe(0);
  });
});

describe("rubberBand", () => {
  it("does nothing without overflow", () => {
    expect(rubberBand(0, 390)).toBe(0);
  });

  it("follows less than the finger, more slowly the further it goes", () => {
    const short = rubberBand(40, 390);
    const long = rubberBand(200, 390);
    expect(short).toBeGreaterThan(0);
    expect(short).toBeLessThan(40);
    expect(long).toBeGreaterThan(short);
    expect(long - short).toBeLessThan(160 * (short / 40));
  });

  it("never travels past the dimension, in either direction", () => {
    expect(rubberBand(100_000, 390)).toBeLessThan(390);
    expect(rubberBand(-40, 390)).toBe(-rubberBand(40, 390));
  });
});

describe("withEdgeResistance", () => {
  it("follows the finger 1:1 between the bounds", () => {
    expect(withEdgeResistance(-150, -300, 0, 390)).toBe(-150);
    expect(withEdgeResistance(0, -300, 0, 390)).toBe(0);
  });

  it("resists past either bound", () => {
    const past = withEdgeResistance(60, -300, 0, 390);
    expect(past).toBeGreaterThan(0);
    expect(past).toBeLessThan(60);
    const before = withEdgeResistance(-360, -300, 0, 390);
    expect(before).toBeLessThan(-300);
    expect(before).toBeGreaterThan(-360);
  });
});
