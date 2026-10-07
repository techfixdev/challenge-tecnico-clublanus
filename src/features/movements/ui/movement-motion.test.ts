import { describe, expect, it } from "vitest";

import {
  MAX_STAGGER_STEPS,
  movementTileTransitionName,
  rowEnterStep,
} from "./movement-motion";

describe("rowEnterStep", () => {
  it("staggers rows one step apart from the top of the batch", () => {
    expect([0, 1, 2, 3].map((index) => rowEnterStep(index))).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it("staggers at most 6 rows: the rest enter with the sixth", () => {
    expect(MAX_STAGGER_STEPS).toBe(5);
    expect(rowEnterStep(5)).toBe(5);
    expect(rowEnterStep(50)).toBe(MAX_STAGGER_STEPS);
  });

  it("restarts at 0 for rows appended by a later batch", () => {
    // "Cargar más" appended rows 20..39: row 20 enters first, without the cap's wait.
    expect(rowEnterStep(20, 20)).toBe(0);
    expect(rowEnterStep(23, 20)).toBe(3);
    // Rows of earlier batches are already on screen (they never re-enter).
    expect(rowEnterStep(5, 20)).toBe(0);
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
