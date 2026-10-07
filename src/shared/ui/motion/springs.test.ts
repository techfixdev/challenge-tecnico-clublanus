import { describe, expect, it } from "vitest";

import * as springs from "./springs";
import { FADE, INSTANT, ROLL_SPRING, SPRING, SPRING_PHYSICS } from "./springs";
import { DURATION_S, EASE } from "./tokens";

type Physics = { stiffness: number; damping: number; mass?: number };

/** ζ = c / (2·√(k·m)): 1 is critically damped, below 1 it bounces past its target. */
function dampingRatio({ stiffness, damping, mass = 1 }: Physics) {
  return damping / (2 * Math.sqrt(stiffness * mass));
}

/** Fraction of the travel a spring overshoots its target by (0 when ζ ≥ 1). */
function overshoot(physics: Physics) {
  const zeta = dampingRatio(physics);
  if (zeta >= 1) return 0;
  return Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta));
}

describe("springs", () => {
  it("has one critically damped spring for everything a gesture drives", () => {
    expect(dampingRatio(SPRING_PHYSICS)).toBeGreaterThanOrEqual(1);
    expect(dampingRatio(SPRING_PHYSICS)).toBeLessThan(1.1);
    expect(SPRING).toMatchObject({ type: "spring", ...SPRING_PHYSICS });
  });

  it("keeps the odometer roll as the only other spring, without a visible bounce", () => {
    // ζ ≈ 0.97: it lands a few millionths past the digit, far below a pixel.
    expect(overshoot(ROLL_SPRING as Physics)).toBeLessThan(0.0001);
  });

  it("exports no other spring", () => {
    const exported = Object.entries(springs)
      .filter(
        ([, value]) =>
          typeof value === "object" && value !== null && "stiffness" in value,
      )
      .map(([name]) => name)
      .sort();
    expect(exported).toEqual([
      "INDICATOR_SPRING",
      "PRESS_SPRING",
      "ROLL_SPRING",
      "SPRING",
      "SPRING_PHYSICS",
    ]);
    // The role names are the one spring itself, never a preset of their own.
    expect(springs.INDICATOR_SPRING).toBe(SPRING);
    expect(springs.PRESS_SPRING).toBe(SPRING);
  });

  it("fades with the fast duration and the one curve", () => {
    expect(FADE).toEqual({ duration: DURATION_S.fast, ease: EASE });
    expect(INSTANT).toEqual({ duration: 0 });
  });
});
