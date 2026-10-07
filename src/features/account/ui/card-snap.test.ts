import { describe, expect, it } from "vitest";

import {
  EDGE_RESISTANCE,
  FLICK_VELOCITY,
  resistEdges,
  snapIndex,
  snapProgress,
} from "./card-snap";

// Three cards at 390px: each rests 303px further along; the last one is clamped.
const snaps = [0, 303, 551];

describe("snapIndex: the card a release settles on", () => {
  it("settles on the card nearest to where a slow release leaves the deck", () => {
    expect(snapIndex({ offset: 120, velocity: 0, snaps, from: 0 })).toBe(0);
    expect(snapIndex({ offset: 180, velocity: 0, snaps, from: 0 })).toBe(1);
    expect(snapIndex({ offset: 200, velocity: 0, snaps, from: 1 })).toBe(1);
  });

  it("lets a slow release still moving coast a little further, as the app's drags do", () => {
    expect(snapIndex({ offset: 120, velocity: 0, snaps, from: 0 })).toBe(0);
    expect(snapIndex({ offset: 120, velocity: 350, snaps, from: 0 })).toBe(1);
    expect(snapIndex({ offset: 180, velocity: -350, snaps, from: 0 })).toBe(0);
  });

  it("carries the release's velocity: a flick turns a card even after a short drag", () => {
    expect(
      snapIndex({ offset: 30, velocity: FLICK_VELOCITY, snaps, from: 0 }),
    ).toBe(1);
    expect(
      snapIndex({ offset: 280, velocity: -FLICK_VELOCITY, snaps, from: 1 }),
    ).toBe(0);
  });

  it("lets a flick against a long drag win: the finger's last word decides", () => {
    expect(
      snapIndex({ offset: 250, velocity: -FLICK_VELOCITY, snaps, from: 0 }),
    ).toBe(0);
  });

  it("turns at most one card per release, however hard the flick", () => {
    expect(snapIndex({ offset: 40, velocity: 9000, snaps, from: 0 })).toBe(1);
  });

  it("never leaves the deck: a flick past either end rests on the end card", () => {
    expect(
      snapIndex({ offset: 560, velocity: FLICK_VELOCITY, snaps, from: 2 }),
    ).toBe(2);
    expect(
      snapIndex({ offset: -20, velocity: -FLICK_VELOCITY, snaps, from: 0 }),
    ).toBe(0);
  });

  it("is the first card before the deck is measured", () => {
    expect(snapIndex({ offset: 0, velocity: 800, snaps: [], from: 0 })).toBe(0);
  });
});

describe("snapProgress: the deck's position counted in cards", () => {
  it("is the resting card's index, and a fraction in between", () => {
    expect(snapProgress(0, snaps)).toBe(0);
    expect(snapProgress(303, snaps)).toBe(1);
    expect(snapProgress(151.5, snaps)).toBeCloseTo(0.5);
    expect(snapProgress(427, snaps)).toBeCloseTo(1.5);
  });

  it("stays within the deck while it is rubber-banded past an end", () => {
    expect(snapProgress(-40, snaps)).toBe(0);
    expect(snapProgress(600, snaps)).toBe(2);
  });

  it("is 0 before the deck is measured", () => {
    expect(snapProgress(120, [])).toBe(0);
  });
});

describe("resistEdges: the deck past either end", () => {
  it("follows the finger 1:1 between the first and the last card", () => {
    expect(resistEdges(0, 551)).toBe(0);
    expect(resistEdges(300, 551)).toBe(300);
    expect(resistEdges(551, 551)).toBe(551);
  });

  it("moves only a fraction of the finger's travel past an end", () => {
    expect(resistEdges(-100, 551)).toBeCloseTo(-100 * EDGE_RESISTANCE);
    expect(resistEdges(651, 551)).toBeCloseTo(551 + 100 * EDGE_RESISTANCE);
  });
});
