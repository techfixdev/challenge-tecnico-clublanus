"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () =>
  import("./motion-features").then((module) => module.default);

/**
 * Motion setup for the signed-in area.
 * - `LazyMotion` + `m.*` components: the page ships Motion's small core, and the feature
 *   bundle (animations, gestures, layout) arrives in a separate chunk after hydration.
 *   `strict` throws if someone renders the heavy `motion.*` component instead of `m.*`.
 * - `reducedMotion="user"`: under "reduce motion", every transform/layout animation jumps
 *   to its end; opacity and color still fade. Effects driven by motion values (tilt,
 *   scroll-linked scaling) check the preference themselves.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
