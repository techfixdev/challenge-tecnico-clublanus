"use client";

import {
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
} from "motion/react";
import * as m from "motion/react-m";
import {
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { FADE, INSTANT, SPRING_PHYSICS } from "@/shared/ui/motion/springs";
import { useReducedMotionPreference } from "@/shared/ui/reduced-motion";

import { DeckDraggingContext } from "./card-deck-drag";
import { isFlipTap } from "./tap-guard";

/** Max rotation in degrees when the finger is on an edge of the card. */
const MAX_TILT_X = 10;
const MAX_TILT_Y = 12;

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

/** How far, in px, the flat text layer slides at full tilt (the parallax). */
const TEXT_PARALLAX = 5;

/** The shadow the faces cast on the page, the same on both. */
const FACE =
  "overflow-hidden rounded-3xl shadow-[0_1px_2px_color-mix(in_srgb,var(--color-primary-dark)_18%,transparent),0_10px_20px_-12px_color-mix(in_srgb,var(--color-primary-dark)_45%,transparent)] [backface-visibility:hidden]";

/** Which face a flip just turned up; silent until the user flips the card once. */
function flipAnnouncement({
  flipped,
  flippedOnce,
}: {
  flipped: boolean;
  flippedOnce: boolean;
}): string {
  if (!flippedOnce) return "";
  return flipped ? "Reverso de la tarjeta" : "Frente de la tarjeta";
}

/**
 * A card that reacts like a physical object: only while pressed, it tilts towards the
 * finger in 3D, a faint gloss follows the light and its shadow shifts; on release it
 * settles back flat. Inside the carousel, a press that turns into a sideways drag belongs
 * to the carousel: the card lets go of the tilt (and of the tap) as the deck moves. Every turn uses the one critically damped spring
 * (springs.ts): it follows the finger closely and never wobbles past its rest.
 *
 * With a `back`, a tap flips it over (rotateY with the spring; it dips slightly while it
 * turns so its near edge stays inside the carousel). The whole card is a toggle button
 * (`flipLabel`, `aria-pressed`) that sits under the faces: the faces let pointer events
 * through to it, except their own controls (the eyes). Only a real tap flips: a carousel
 * drag, a tilt drag or a long press do not (see tap-guard); Enter and Space always do.
 * The hidden face is `inert` and `aria-hidden`.
 *
 * The card is two layers: the art (`art`, `backArt`: surface, brand mark, sheen) tilts
 * and flips in 3D, while the text (`children`, `back`) lies on a flat layer above it that
 * only slides a few px with the tilt, so balances, numbers and names never render skewed.
 *
 * Everything runs on motion values (no React state per frame), and only `transform`,
 * `opacity` and background position change, so the browser composites it on the GPU.
 * Under reduced motion the card stays flat and still, and the flip is a crossfade.
 */
export function LivingCard({
  tone,
  art,
  back,
  backArt,
  flipLabel,
  children,
}: {
  tone: CardTone;
  /** The front's decorative art (surface, brand mark): it tilts and flips in 3D. */
  art?: ReactNode;
  /** The back face's text and controls; without it the card does not flip. */
  back?: ReactNode;
  /** The back's decorative art, turned 180° inside the card. */
  backArt?: ReactNode;
  /** Accessible name of the flip button, e.g. "Ver reverso de la tarjeta …". */
  flipLabel?: string;
  /** The front's text and controls: a flat layer that never rotates. */
  children: ReactNode;
}) {
  const reduced = useReducedMotionPreference();
  const deckDragging = useContext(DeckDraggingContext);
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

  // The flat text layer follows the art without rotating: a small parallax slide (the
  // way a layer just above a tilted surface moves), never a skew that would blur glyphs.
  const textX = useTransform(
    rotateY,
    [-MAX_TILT_Y, MAX_TILT_Y],
    [-TEXT_PARALLAX, TEXT_PARALLAX],
  );
  const textY = useTransform(
    rotateX,
    [-MAX_TILT_X, MAX_TILT_X],
    [TEXT_PARALLAX, -TEXT_PARALLAX],
  );
  // While the card turns over, each face's text narrows with it (|cos| of the turn) and
  // fades out well before the face goes edge-on, so it never shows mirrored or detached.
  const flipCos = useTransform(flipAngle, (angle) =>
    Math.cos((angle * Math.PI) / 180),
  );
  const textScaleX = useTransform(flipCos, (cos) =>
    Math.max(Math.abs(cos), 0.001),
  );
  const frontTextOpacity = useTransform(flipCos, [0.6, 0.95], [0, 1]);
  const backTextOpacity = useTransform(flipCos, [-0.95, -0.6], [1, 0]);
  // One gloss layer per face, so it turns with the face it lies on.
  const sheen = (
    <m.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 mix-blend-soft-light"
      style={{ background: sheenBackground, opacity: sheenOpacity }}
    />
  );

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

  // The carousel took the press over: flatten the card and make the press no tap.
  const notInDeck = useMotionValue(false);
  useMotionValueEvent(deckDragging ?? notInDeck, "change", (dragging) => {
    if (!dragging) return;
    release();
    if (press.current) press.current.cancelled = true;
  });

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
    // A carousel drag releases the card (above); a page scroll cancels the pointer.
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
      {/* The art (gradient, sheen, brand mark) tilts and flips in 3D. It is decorative:
        the text layer above it carries everything a reader needs. */}
      <m.div
        data-testid="living-card-surface"
        data-flipped={back ? flipped : undefined}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] [transform-style:preserve-3d]"
        style={{ rotateX, rotateY: surfaceRotateY, scale: surfaceScale }}
      >
        <m.div
          data-art="front"
          className={`absolute inset-0 ${FACE}`}
          initial={false}
          animate={{ opacity: reduced && flipped ? 0 : 1 }}
          transition={fade}
        >
          {art}
          {sheen}
        </m.div>
        {back && (
          <m.div
            data-art="back"
            className={`absolute inset-0 ${FACE}`}
            // Under reduced motion both faces lie flat and the back fades over the front.
            style={{ rotateY: reduced ? 0 : 180 }}
            initial={false}
            animate={{ opacity: reduced && !flipped ? 0 : 1 }}
            transition={fade}
          >
            {backArt}
            {sheen}
          </m.div>
        )}
      </m.div>
      {/* The text never rotates, so it stays level and crisp: it only slides a few px
        with the tilt (as if it floated just above the art) and, during a flip, narrows
        with the turning face and fades out before the face goes edge-on. */}
      <m.div
        data-testid="living-card-text"
        className="pointer-events-none relative z-[2]"
        style={{ x: textX, y: textY, scale: surfaceScale }}
      >
        <m.div
          data-face="front"
          className="relative"
          inert={back && flipped ? true : undefined}
          aria-hidden={back && flipped ? true : undefined}
          style={{ scaleX: textScaleX }}
          initial={false}
          animate={{ opacity: reduced && flipped ? 0 : 1 }}
          transition={fade}
        >
          <m.div style={{ opacity: reduced ? 1 : frontTextOpacity }}>
            {children}
          </m.div>
        </m.div>
        {back && (
          <m.div
            data-face="back"
            className="absolute inset-0"
            inert={!flipped || undefined}
            aria-hidden={!flipped || undefined}
            style={{ scaleX: textScaleX }}
            initial={false}
            animate={{ opacity: reduced && !flipped ? 0 : 1 }}
            transition={fade}
          >
            <m.div style={{ opacity: reduced ? 1 : backTextOpacity }}>
              {back}
            </m.div>
          </m.div>
        )}
      </m.div>
      {back && (
        <span className="sr-only" aria-live="polite">
          {flipAnnouncement({ flipped, flippedOnce })}
        </span>
      )}
    </div>
  );
}
