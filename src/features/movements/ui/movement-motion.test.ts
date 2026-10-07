import { describe, expect, it } from "vitest";

import {
  MAX_STAGGER_STEPS,
  movementTileTransitionName,
  rowEnterStep,
} from "./movement-motion";

describe("rowEnterStep", () => {
  it("staggers rows one step apart from the top of the list", () => {
    expect([0, 1, 2, 3].map((index) => rowEnterStep(index))).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it("staggers at most 6 rows: the rest enter with the sixth", () => {
    expect(MAX_STAGGER_STEPS).toBe(5);
    expect(rowEnterStep(5)).toBe(5);
    expect(rowEnterStep(50)).toBe(MAX_STAGGER_STEPS);
  });
});

describe("movementTileTransitionName", () => {
  it("is unique per movement and a valid CSS identifier", () => {
    const name = movementTileTransitionName("cmov000000000000000000001");

    expect(name).toBe("movement-tile-cmov000000000000000000001");
    expect(name).toMatch(/^[a-z][a-z0-9-]*$/);
    expect(movementTileTransitionName("cmov2")).not.toBe(name);
  });
});
