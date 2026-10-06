"use client";

import {
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import * as m from "motion/react-m";
import { useRef, type PointerEvent, type ReactNode } from "react";

import { TILT_SPRING } from "@/shared/ui/motion/springs";
import { useReducedMotionPreference } from "@/shared/ui/reduced-motion";

/** Max rotation in degrees when the finger is on an edge of the card. */
export const MAX_TILT_X = 10;
export const MAX_TILT_Y = 12;

/**
 * Ambient shadow under each card tone (granate card, pink Visa card): a soft gradient
 * instead of a `blur()` filter, which would repaint a large layer while it moves.
 */
const SHADOW_TONE = {
  primary:
    "bg-[radial-gradient(closest-side,rgb(78_17_28/0.5),rgb(78_17_28/0.18)_60%,transparent)]",
  pink: "bg-[radial-gradient(closest-side,rgb(200_110_120/0.5),rgb(200_110_120/0.16)_60%,transparent)]",
} as const;

export type CardTone = keyof typeof SHADOW_TONE;

/**
 * A card that reacts like a physical object: pressed and dragged, it tilts towards the
 * finger in 3D, a glossy light slides across its surface and its shadow shifts; on
 * release it springs back. The first card also gets a single light sweep when it mounts.
 *
 * Everything runs on motion values (no React state per frame), and only `transform`,
 * `opacity` and background position change, so the browser composites it on the GPU.
 * Under reduced motion the card stays flat and still.
 */
export function LivingCard({
  tone,
  sweep = false,
  children,
}: {
  tone: CardTone;
  /** Plays the one-time light sweep on mount (the primary card). */
  sweep?: boolean;
  children: ReactNode;
}) {
  const reduced = useReducedMotionPreference();
  const pressed = useRef(false);

  // Pointer position over the card, from -0.5 (left/top edge) to 0.5 (right/bottom).
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(
    useTransform(pointerX, [-0.5, 0.5], [-MAX_TILT_Y, MAX_TILT_Y]),
    TILT_SPRING,
  );
  const rotateX = useSpring(
    useTransform(pointerY, [-0.5, 0.5], [MAX_TILT_X, -MAX_TILT_X]),
    TILT_SPRING,
  );

  // The light comes from the top-left: the sheen moves with the tilt and the shadow
  // moves the opposite way, as if the card lifted off the page.
  const sheenX = useTransform(rotateY, [-MAX_TILT_Y, MAX_TILT_Y], [-30, 30]);
  const sheenY = useTransform(rotateX, [-MAX_TILT_X, MAX_TILT_X], [25, -25]);
  const sheenBackground = useMotionTemplate`radial-gradient(120% 90% at ${useTransform(sheenX, (x) => 30 + x)}% ${useTransform(sheenY, (y) => 20 + y)}%, rgb(255 255 255 / 0.55), transparent 60%)`;
  const sheenOpacity = useTransform(
    [rotateX, rotateY],
    ([x, y]: number[]) =>
      0.35 + 0.45 * Math.min(1, Math.hypot(x / MAX_TILT_X, y / MAX_TILT_Y)),
  );
  const shadowX = useTransform(rotateY, [-MAX_TILT_Y, MAX_TILT_Y], [10, -10]);
  const shadowY = useTransform(rotateX, [-MAX_TILT_X, MAX_TILT_X], [0, 8]);

  function follow(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - box.left) / box.width - 0.5);
    pointerY.set((event.clientY - box.top) / box.height - 0.5);
  }

  function release() {
    pressed.current = false;
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    // No pointer capture: it would retarget the click of the eye toggle to this wrapper.
    // Swiping the carousel cancels the pointer, which releases the card.
    <div
      data-testid="living-card"
      className="card-scale relative isolate select-none [perspective:800px]"
      onPointerDown={(event) => {
        if (reduced) return;
        pressed.current = true;
        follow(event);
      }}
      onPointerMove={(event) => {
        if (pressed.current) follow(event);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
    >
      <m.div
        aria-hidden="true"
        className={`absolute inset-x-0 top-10 -bottom-2 -z-10 ${SHADOW_TONE[tone]}`}
        style={{ x: shadowX, y: shadowY }}
      />
      <m.div
        data-testid="living-card-surface"
        className="relative overflow-hidden rounded-3xl shadow-[0_1px_2px_rgb(78_17_28/0.18),0_10px_20px_-12px_rgb(78_17_28/0.45)]"
        style={{ rotateX, rotateY }}
      >
        {children}
        <m.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 mix-blend-soft-light"
          style={{ background: sheenBackground, opacity: sheenOpacity }}
        />
        {sweep && !reduced && (
          <m.div
            aria-hidden="true"
            data-testid="card-sweep"
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-[linear-gradient(105deg,transparent_15%,rgb(255_255_255/0.4)_50%,transparent_85%)] mix-blend-overlay"
            initial={{ x: "0%" }}
            animate={{ x: "400%" }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </m.div>
    </div>
  );
}
