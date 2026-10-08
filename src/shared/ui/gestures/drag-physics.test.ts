import { describe, expect, it } from "vitest";

import { SPRING_PHYSICS } from "../motion/springs";
import {
  BACK_COMPLETE_FRACTION,
  dragProgress,
  FLICK_VELOCITY,
  lockAxis,
  projectRelease,
  releaseVelocity,
  rubberBand,
  settleVelocity,
  shouldCompleteBack,
  snapToStep,
  withEdgeResistance,
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

describe("releaseVelocity", () => {
  it("is the speed over the last stretch of the gesture, in px/s", () => {
    const samples = [
      { time: 0, position: 0 },
      { time: 100, position: 10 },
      { time: 150, position: 40 },
      { time: 200, position: 70 },
    ];
    // Only the last 100ms count: (70 - 10) / 0.1s.
    expect(releaseVelocity(samples, 200)).toBeCloseTo(600);
  });

  it("is zero when the finger rested before lifting", () => {
    const samples = [
      { time: 0, position: 0 },
      { time: 16, position: 30 },
    ];
    expect(releaseVelocity(samples, 300)).toBe(0);
  });

  it("counts a pause before lifting: a finger that slows to a stop throws less", () => {
    const samples = [
      { time: 0, position: 0 },
      { time: 20, position: 50 },
    ];
    // Lifted 40ms after its last move: 50px over the 60ms up to the release.
    expect(releaseVelocity(samples, 60)).toBeCloseTo(833.33, 1);
  });

  it("is zero without two samples to compare", () => {
    expect(releaseVelocity([], 0)).toBe(0);
    expect(releaseVelocity([{ time: 10, position: 5 }], 10)).toBe(0);
  });

  it("is negative when the finger was going back", () => {
    const samples = [
      { time: 0, position: 100 },
      { time: 50, position: 60 },
    ];
    expect(releaseVelocity(samples, 50)).toBeCloseTo(-800);
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

  it("stretches the same either way it is pulled", () => {
    expect(rubberBand(-40, WIDTH)).toBe(-rubberBand(40, WIDTH));
  });
});

describe("withEdgeResistance", () => {
  it("follows the finger 1:1 between the bounds", () => {
    expect(withEdgeResistance(-150, -300, 0, WIDTH)).toBe(-150);
    expect(withEdgeResistance(0, -300, 0, WIDTH)).toBe(0);
  });

  it("resists past either bound", () => {
    const past = withEdgeResistance(60, -300, 0, WIDTH);
    expect(past).toBeGreaterThan(0);
    expect(past).toBeLessThan(60);
    const before = withEdgeResistance(-360, -300, 0, WIDTH);
    expect(before).toBeLessThan(-300);
    expect(before).toBeGreaterThan(-360);
  });
});

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

describe("snapToStep", () => {
  const STEP = 100;

  it("snaps a still release to the nearest step", () => {
    expect(snapToStep(0, 0, STEP, 4)).toBe(0);
    expect(snapToStep(-140, 0, STEP, 4)).toBe(1);
    expect(snapToStep(-160, 0, STEP, 4)).toBe(2);
  });

  it("lets a flick carry past the nearest step", () => {
    // Released 30% of the way to the next step, but moving fast towards it.
    expect(snapToStep(-30, -1000, STEP, 4)).toBe(1);
    // The same position flicked back lands on the first step.
    expect(snapToStep(-130, 1000, STEP, 4)).toBe(0);
  });

  it("never snaps outside the strip", () => {
    expect(snapToStep(80, 2000, STEP, 4)).toBe(0);
    expect(snapToStep(-900, -2000, STEP, 4)).toBe(3);
    expect(snapToStep(-300, 0, STEP, 1)).toBe(0);
    expect(snapToStep(-300, 0, STEP, 0)).toBe(0);
  });
});

describe("settleVelocity", () => {
  // The spring's natural frequency: faster than this × distance, it would pass the target.
  const omega = Math.sqrt(SPRING_PHYSICS.stiffness / SPRING_PHYSICS.mass);

  it("keeps a velocity the spring can absorb before reaching its target", () => {
    expect(settleVelocity(500, 100)).toBe(500);
  });

  it("caps a velocity towards the target so the spring lands without passing it", () => {
    expect(settleVelocity(5000, 100)).toBeCloseTo(omega * 100);
    expect(settleVelocity(-5000, -100)).toBeCloseTo(-omega * 100);
  });

  it("keeps a velocity away from the target: the spring turns it around, never past", () => {
    expect(settleVelocity(-800, 100)).toBe(-800);
  });

  it("keeps the velocity when already at the target", () => {
    expect(settleVelocity(300, 0)).toBe(300);
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
