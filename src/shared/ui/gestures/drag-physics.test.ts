import { describe, expect, it } from "vitest";

import {
  BACK_COMPLETE_FRACTION,
  dragProgress,
  estimateVelocity,
  FLICK_VELOCITY,
  lockAxis,
  rubberBand,
  SHEET_DISMISS_FRACTION,
  shouldCompleteBack,
  shouldDismissSheet,
} from "./drag-physics";

const WIDTH = 390;
const HEIGHT = 300;

describe("lockAxis", () => {
  it("waits until the finger has moved a few pixels", () => {
    expect(lockAxis(3, 2, 8)).toBeNull();
    expect(lockAxis(-5, 5, 8)).toBeNull();
  });

  it("locks to the axis the finger moved along the most", () => {
    expect(lockAxis(12, 4, 8)).toBe("x");
    expect(lockAxis(-12, 4, 8)).toBe("x");
    expect(lockAxis(3, 14, 8)).toBe("y");
    expect(lockAxis(2, -14, 8)).toBe("y");
  });

  it("treats a perfect diagonal as vertical, so page scroll always wins a tie", () => {
    expect(lockAxis(10, 10, 8)).toBe("y");
  });
});

describe("estimateVelocity", () => {
  it("is the speed over the last stretch of the gesture, in px/s", () => {
    const samples = [
      { time: 0, position: 0 },
      { time: 100, position: 10 },
      { time: 150, position: 40 },
      { time: 200, position: 70 },
    ];
    // Only the last 100ms count: (70 - 10) / 0.1s.
    expect(estimateVelocity(samples, 200)).toBeCloseTo(600);
  });

  it("is zero when the finger rested before lifting", () => {
    const samples = [
      { time: 0, position: 0 },
      { time: 16, position: 30 },
    ];
    expect(estimateVelocity(samples, 300)).toBe(0);
  });

  it("is zero without two samples to compare", () => {
    expect(estimateVelocity([], 0)).toBe(0);
    expect(estimateVelocity([{ time: 10, position: 5 }], 10)).toBe(0);
  });

  it("is negative when the finger was going back", () => {
    const samples = [
      { time: 0, position: 100 },
      { time: 50, position: 60 },
    ];
    expect(estimateVelocity(samples, 50)).toBeCloseTo(-800);
  });
});

describe("shouldCompleteBack", () => {
  it("goes back when released past the threshold", () => {
    const past = WIDTH * BACK_COMPLETE_FRACTION + 1;
    expect(shouldCompleteBack(past, 0, WIDTH)).toBe(true);
  });

  it("springs back when released short of it, slowly", () => {
    const short = WIDTH * BACK_COMPLETE_FRACTION - 1;
    expect(shouldCompleteBack(short, 0, WIDTH)).toBe(false);
    expect(shouldCompleteBack(short, FLICK_VELOCITY - 1, WIDTH)).toBe(false);
  });

  it("goes back on a rightward flick, however short", () => {
    expect(shouldCompleteBack(30, FLICK_VELOCITY + 1, WIDTH)).toBe(true);
  });

  it("stays when the finger was flicking back left, even past the threshold", () => {
    expect(shouldCompleteBack(WIDTH * 0.6, -FLICK_VELOCITY - 1, WIDTH)).toBe(
      false,
    );
  });

  it("never goes back without having moved right", () => {
    expect(shouldCompleteBack(0, FLICK_VELOCITY * 2, WIDTH)).toBe(false);
  });
});

describe("shouldDismissSheet", () => {
  it("dismisses when dragged down past the threshold", () => {
    const past = HEIGHT * SHEET_DISMISS_FRACTION + 1;
    expect(shouldDismissSheet(past, 0, HEIGHT)).toBe(true);
  });

  it("settles back when released short of it, slowly", () => {
    const short = HEIGHT * SHEET_DISMISS_FRACTION - 1;
    expect(shouldDismissSheet(short, 0, HEIGHT)).toBe(false);
  });

  it("dismisses on a downward flick, however short", () => {
    expect(shouldDismissSheet(20, FLICK_VELOCITY + 1, HEIGHT)).toBe(true);
  });

  it("stays when flicked back up, even past the threshold", () => {
    expect(shouldDismissSheet(HEIGHT * 0.5, -FLICK_VELOCITY - 1, HEIGHT)).toBe(
      false,
    );
  });

  it("stays when pulled up", () => {
    expect(shouldDismissSheet(-40, FLICK_VELOCITY * 2, HEIGHT)).toBe(false);
  });
});

describe("rubberBand", () => {
  it("does not resist at rest", () => {
    expect(rubberBand(0, HEIGHT)).toBe(0);
  });

  it("moves less than the finger, and less and less the further it goes", () => {
    const near = rubberBand(30, HEIGHT);
    const far = rubberBand(300, HEIGHT);
    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThan(30);
    // Each pixel of the finger past the first 30 moves it less than those first ones did.
    expect((far - near) / 270).toBeLessThan(near / 30);
  });

  it("never travels past the dimension it is measured against", () => {
    expect(rubberBand(100_000, HEIGHT)).toBeLessThan(HEIGHT);
  });
});

describe("dragProgress", () => {
  it("is the share of the extent travelled, clamped to 0..1", () => {
    expect(dragProgress(0, WIDTH)).toBe(0);
    expect(dragProgress(WIDTH / 2, WIDTH)).toBe(0.5);
    expect(dragProgress(WIDTH * 2, WIDTH)).toBe(1);
    expect(dragProgress(-20, WIDTH)).toBe(0);
  });

  it("is zero for an unmeasured (empty) extent", () => {
    expect(dragProgress(10, 0)).toBe(0);
  });
});
