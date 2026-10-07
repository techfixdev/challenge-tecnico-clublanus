"use client";

import {
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import * as m from "motion/react-m";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { FADE, INSTANT, SPRING_PHYSICS } from "@/shared/ui/motion/springs";
import { useReducedMotionPreference } from "@/shared/ui/reduced-motion";

import { isFlipTap } from "./tap-guard";

/** Max rotation in degrees when the finger is on an edge of the card. */
export const MAX_TILT_X = 10;
export const MAX_TILT_Y = 12;

/**
 * Ambient shadow under each card tone (granate card, gold Visa card): a soft gradient
 * instead of a `blur()` filter, which would repaint a large layer while it moves.
 */
const SHADOW_TONE = {
  primary:
    "bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-primary-dark)_40%,transparent),color-mix(in_srgb,var(--color-primary-dark)_14%,transparent)_60%,transparent)]",
  gold: "bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-gold-dark)_40%,transparent),color-mix(in_srgb,var(--color-gold-dark)_12%,transparent)_60%,transparent)]",
} as const;

export type CardTone = keyof typeof SHADOW_TONE;

/** Where and when the press that may become a flip started. */
type Press = {
  x: number;
  y: number;
  left: number;
  time: number;
  cancelled: boolean;
};

/** The shadow the faces cast on the page, the same on both. */
const FACE =
  "overflow-hidden rounded-3xl shadow-[0_1px_2px_color-mix(in_srgb,var(--color-primary-dark)_18%,transparent),0_10px_20px_-12px_color-mix(in_srgb,var(--color-primary-dark)_45%,transparent)] [backface-visibility:hidden]";

/**
 * A card that reacts like a physical object: only while pressed and dragged, it tilts
 * towards the finger in 3D, a faint gloss follows the light and its shadow shifts; on
 * release it settles back flat. Every turn uses the one critically damped spring
 * (springs.ts): it follows the finger closely and never wobbles past its rest.
 *
 * With a `back`, a tap flips it over (rotateY with the spring; it dips slightly while it
 * turns so its near edge stays inside the carousel). The whole card is a toggle button
 * (`flipLabel`, `aria-pressed`) that sits under the faces: the faces let pointer events
 * through to it, except their own controls (the eyes). Only a real tap flips: a carousel
 * swipe, a tilt drag or a long press do not (see tap-guard); Enter and Space always do.
 * The hidden face is `inert` and `aria-hidden`.
 *
 * Everything runs on motion values (no React state per frame), and only `transform`,
 * `opacity` and background position change, so the browser composites it on the GPU.
 * Under reduced motion the card stays flat and still, and the flip is a crossfade.
 */
export function LivingCard({
  tone,
  back,
  flipLabel,
  children,
}: {
  tone: CardTone;
  /** The card's back face; without it the card does not flip. */
  back?: ReactNode;
  /** Accessible name of the flip button, e.g. "Ver reverso de la tarjeta …". */
  flipLabel?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotionPreference();
  const pressed = useRef(false);
  const press = useRef<Press | null>(null);
  const [flipped, setFlipped] = useState(false);
  // The crossfade only runs for a flip the user asked for, never when the reduced-motion
  // preference resolves after hydration (that switch must not fade the back in and out).
  const [flippedOnce, setFlippedOnce] = useState(false);

  // Pointer position over the card, from -0.5 (left/top edge) to 0.5 (right/bottom).
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(
    useTransform(pointerX, [-0.5, 0.5], [-MAX_TILT_Y, MAX_TILT_Y]),
    SPRING_PHYSICS,
  );
  const rotateX = useSpring(
    useTransform(pointerY, [-0.5, 0.5], [MAX_TILT_X, -MAX_TILT_X]),
    SPRING_PHYSICS,
  );

  // The light comes from the top-left: the sheen moves with the tilt and the shadow
  // moves the opposite way, as if the card lifted off the page. Both stay subtle: a
  // material cue, never a shine that calls attention to itself.
  const sheenX = useTransform(rotateY, [-MAX_TILT_Y, MAX_TILT_Y], [-30, 30]);
  const sheenY = useTransform(rotateX, [-MAX_TILT_X, MAX_TILT_X], [25, -25]);
  const sheenBackground = useMotionTemplate`radial-gradient(120% 90% at ${useTransform(sheenX, (x) => 30 + x)}% ${useTransform(sheenY, (y) => 20 + y)}%, rgb(255 255 255 / 0.4), transparent 60%)`;
  const sheenOpacity = useTransform(
    [rotateX, rotateY],
    ([x, y]: number[]) =>
      0.25 + 0.25 * Math.min(1, Math.hypot(x / MAX_TILT_X, y / MAX_TILT_Y)),
  );
  const shadowX = useTransform(rotateY, [-MAX_TILT_Y, MAX_TILT_Y], [10, -10]);
  const shadowY = useTransform(rotateX, [-MAX_TILT_X, MAX_TILT_X], [0, 8]);

  // The flip adds to the tilt's rotateY. The back face is turned 180° inside the card, so
  // at 180° + tilt it faces the viewer and tilts exactly like the front does.
  const flipAngle = useSpring(0, SPRING_PHYSICS);
  const surfaceRotateY = useTransform(() => rotateY.get() + flipAngle.get());
  const surfaceScale = useTransform(
    flipAngle,
    (angle) => 1 - 0.14 * Math.abs(Math.sin((angle * Math.PI) / 180)),
  );
  useEffect(() => {
    if (reduced) flipAngle.jump(0);
    else flipAngle.set(flipped ? 180 : 0);
  }, [flipped, reduced, flipAngle]);
  const fade = reduced && flippedOnce ? FADE : INSTANT;

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

  function startPress(event: PointerEvent<HTMLButtonElement>) {
    press.current = {
      x: event.clientX,
      y: event.clientY,
      left: event.currentTarget.getBoundingClientRect().left,
      time: event.timeStamp,
      cancelled: false,
    };
  }

  function flipOnTap(event: MouseEvent<HTMLButtonElement>) {
    const start = press.current;
    press.current = null;
    const tap = isFlipTap({
      // Enter / Space click a button with `detail` 0 (no pointer involved).
      keyboard: event.detail === 0,
      pointer: start
        ? {
            dx: event.clientX - start.x,
            dy: event.clientY - start.y,
            cardShift:
              event.currentTarget.getBoundingClientRect().left - start.left,
            elapsedMs: event.timeStamp - start.time,
            cancelled: start.cancelled,
          }
        : undefined,
    });
    if (!tap) return;
    setFlipped((current) => !current);
    setFlippedOnce(true);
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
      {back && (
        <button
          type="button"
          aria-label={flipLabel}
          aria-pressed={flipped}
          data-testid="card-flip"
          className="absolute inset-0 z-0 rounded-3xl focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:outline-none"
          onPointerDown={startPress}
          onPointerCancel={() => {
            if (press.current) press.current.cancelled = true;
          }}
          onClick={flipOnTap}
        />
      )}
      <m.div
        data-testid="living-card-surface"
        data-flipped={back ? flipped : undefined}
        className="pointer-events-none relative z-[1] [transform-style:preserve-3d]"
        style={{ rotateX, rotateY: surfaceRotateY, scale: surfaceScale }}
      >
        <m.div
          data-face="front"
          className={`relative ${FACE}`}
          inert={back && flipped ? true : undefined}
          aria-hidden={back && flipped ? true : undefined}
          initial={false}
          animate={{ opacity: reduced && flipped ? 0 : 1 }}
          transition={fade}
        >
          {children}
          <m.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-soft-light"
            style={{ background: sheenBackground, opacity: sheenOpacity }}
          />
        </m.div>
        {back && (
          <m.div
            data-face="back"
            className={`absolute inset-0 ${FACE}`}
            inert={!flipped || undefined}
            aria-hidden={!flipped || undefined}
            // Under reduced motion both faces lie flat and the back fades over the front.
            style={{ rotateY: reduced ? 0 : 180 }}
            initial={false}
            animate={{ opacity: reduced && !flipped ? 0 : 1 }}
            transition={fade}
          >
            {back}
            <m.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 mix-blend-soft-light"
              style={{ background: sheenBackground, opacity: sheenOpacity }}
            />
          </m.div>
        )}
      </m.div>
      {back && (
        <span className="sr-only" aria-live="polite">
          {flippedOnce
            ? flipped
              ? "Reverso de la tarjeta"
              : "Frente de la tarjeta"
            : ""}
        </span>
      )}
    </div>
  );
}
