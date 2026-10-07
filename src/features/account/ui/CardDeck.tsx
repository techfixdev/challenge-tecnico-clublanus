"use client";

import {
  animate,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "motion/react";
import * as m from "motion/react-m";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { SPRING } from "@/shared/ui/motion/springs";
import { useReducedMotionPreference } from "@/shared/ui/reduced-motion";

import {
  cardDistance,
  measureSnaps,
  nearestCard,
  opacityAt,
  scaleAt,
} from "./card-deck";
import { DeckDraggingContext } from "./card-deck-drag";
import {
  releaseVelocity,
  resistEdges,
  settleVelocity,
  snapIndex,
  snapProgress,
  type FingerSample,
} from "./card-snap";

export type DeckSlide = { id: string; content: ReactNode };

/** Finger travel (CSS px) before a press commits to an axis: sideways drags the deck. */
const AXIS_LOCK_PX = 8;

/** Width of each dot button (`w-6`): the indicator travels one of these per card. */
const DOT_PITCH_PX = 24;

/** A press on the deck, from pointerdown until it lifts or the page takes it. */
type Press = {
  pointerId: number;
  startX: number;
  startY: number;
  /** The deck's offset when the finger landed: the grabbed point stays under it. */
  startOffset: number;
  axis: "x" | "y" | null;
  samples: FingerSample[];
};

/**
 * Card carousel you push with the finger. Its position is one motion value, `offset`
 * (how far the deck has travelled towards the later cards), written straight to the
 * row's scroll position, never through React state:
 * - A press that moves sideways locks to the deck: the grabbed point stays under the
 *   finger, 1:1, with a faint resistance past either end. A vertical one is left to the
 *   page (`touch-action: pan-y`) or to the card's tilt. Once the deck has the press, the
 *   cards drop their tilt (DeckDraggingContext) and the press is no tap.
 * - On release, the finger's velocity picks the card (card-snap.ts) and carries on into
 *   the one critically damped spring, which settles the deck there without passing it.
 *   Pressing a deck that is still settling catches it where it is.
 * - Each card's scale and opacity follow the same value, so the next card grows into
 *   place under the finger, and the dots' indicator slides with it.
 * - Without a gesture: the dots are buttons and the arrow keys (Home, End) move between
 *   cards. The row is still a real scroll container, so whatever the browser scrolls
 *   into view (keyboard focus, find in page, a screen reader's cursor) brings its card
 *   forward.
 * - Reduced motion: the deck still follows the finger, but lands on its card at once,
 *   and the cards do not scale.
 */
export function CardDeck({
  label,
  slides,
}: {
  label: string;
  slides: DeckSlide[];
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const reduced = useReducedMotionPreference();
  const offset = useMotionValue(0);
  const snaps = useMotionValue<number[]>([]);
  const maxOffset = useRef(0);
  const dragging = useMotionValue(false);
  const press = useRef<Press | null>(null);
  const [active, setActive] = useState(0);
  // Measured on the client: the deck takes the finger from then on.
  const [measured, setMeasured] = useState(false);
  const activeRef = useRef(0);
  const dragFrom = useRef(0);

  // Past either end the row cannot scroll: the cards themselves shift by the overshoot.
  const overshoot = useTransform(
    () => -(offset.get() - clampToDeck(offset.get(), maxOffset.current)),
  );

  function select(index: number) {
    activeRef.current = index;
    setActive(index);
  }

  /** Brings card `index` forward, carrying `velocity` (px/s of offset) into the settle. */
  function settleOn(index: number, velocity = 0) {
    select(index);
    const target = snaps.get()[index] ?? 0;
    if (reduced) {
      offset.jump(target);
      return;
    }
    animate(offset, target, {
      ...SPRING,
      velocity: settleVelocity(velocity, target - offset.get()),
    });
  }

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      maxOffset.current = Math.max(0, list.scrollWidth - list.clientWidth);
      snaps.set(
        measureSnaps(
          Array.from(list.children, (item) => (item as HTMLElement).offsetLeft),
          maxOffset.current,
        ),
      );
      // A new width moves every resting place: keep the same card in front.
      if (!dragging.get()) offset.jump(snaps.get()[activeRef.current] ?? 0);
    };
    measure();
    setMeasured(true);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [snaps, offset, dragging]);

  useMotionValueEvent(offset, "change", (value) => {
    const list = listRef.current;
    if (list) list.scrollLeft = clampToDeck(value, maxOffset.current);
    // While the finger drives the deck, the current card (the dots, `aria-current`) is
    // the one nearest to it; React state changes only when that card changes.
    if (!dragging.get()) return;
    const next = nearestCard(value, snaps.get());
    if (next !== activeRef.current) select(next);
  });

  /**
   * The browser scrolled the row itself (to show a focused control, a find-in-page match,
   * a screen reader's cursor): the deck follows, and settles on the card it moved towards.
   */
  function followBrowserScroll() {
    const list = listRef.current;
    if (!list || press.current) return;
    const ours = clampToDeck(offset.get(), maxOffset.current);
    if (Math.abs(list.scrollLeft - ours) < 1) return;
    const forwards = list.scrollLeft > ours;
    offset.jump(list.scrollLeft);
    const progress = snapProgress(list.scrollLeft, snaps.get());
    settleOn(forwards ? Math.ceil(progress) : Math.floor(progress));
  }

  function pressDeck(event: PointerEvent<HTMLUListElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // A settling deck stops where it is, under the finger.
    offset.stop();
    press.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: offset.get(),
      axis: null,
      samples: [{ time: event.timeStamp, x: event.clientX }],
    };
  }

  function moveDeck(event: PointerEvent<HTMLUListElement>) {
    const current = press.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (current.axis === null) {
      if (Math.abs(dx) > AXIS_LOCK_PX && Math.abs(dx) >= Math.abs(dy)) {
        current.axis = "x";
        dragFrom.current = activeRef.current;
        // The deck keeps the press even if the finger leaves it, and the click that
        // ends a drag lands on the row, not on the card it started on.
        event.currentTarget.setPointerCapture?.(event.pointerId);
        dragging.set(true);
      } else if (Math.abs(dy) > AXIS_LOCK_PX) {
        current.axis = "y";
      }
    }
    if (current.axis !== "x") return;
    current.samples.push({ time: event.timeStamp, x: event.clientX });
    offset.set(resistEdges(current.startOffset - dx, maxOffset.current));
  }

  function releaseDeck(event: PointerEvent<HTMLUListElement>, lifted: boolean) {
    const current = press.current;
    if (!current || current.pointerId !== event.pointerId) return;
    press.current = null;
    if (current.axis !== "x") return;
    // A lifted finger throws the deck; a cancelled one (the system took it) just lets go.
    const velocity = lifted
      ? -releaseVelocity(current.samples, event.timeStamp)
      : 0;
    dragging.set(false);
    settleOn(
      snapIndex({
        offset: offset.get(),
        velocity,
        snaps: snaps.get(),
        from: dragFrom.current,
      }),
      velocity,
    );
  }

  function moveWithKeys(event: KeyboardEvent<HTMLUListElement>) {
    const last = slides.length - 1;
    const next = {
      ArrowLeft: activeRef.current - 1,
      ArrowRight: activeRef.current + 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    settleOn(Math.max(0, Math.min(last, next)));
  }

  return (
    <DeckDraggingContext.Provider value={dragging}>
      {/* `overflow-x-hidden`: the row scrolls only from code (the deck's offset) and from
          the browser's own scroll-into-view, never on its own under a wheel or a swipe. */}
      <ul
        ref={listRef}
        aria-label={label}
        data-measured={measured || undefined}
        tabIndex={0}
        onKeyDown={moveWithKeys}
        onPointerDown={pressDeck}
        onPointerMove={moveDeck}
        onPointerUp={(event) => releaseDeck(event, true)}
        onPointerCancel={(event) => releaseDeck(event, false)}
        onScroll={followBrowserScroll}
        className="flex touch-pan-y [scrollbar-width:none] gap-4 overflow-x-hidden px-6 pt-2 pb-8 select-none focus-visible:outline-none"
      >
        {slides.map((slide, index) => (
          <DeckItem
            key={slide.id}
            index={index}
            offset={offset}
            snaps={snaps}
            overshoot={overshoot}
            reduced={reduced}
          >
            {slide.content}
          </DeckItem>
        ))}
      </ul>
      {slides.length > 1 && (
        // The dots sit in the carousel's bottom padding (room for the card shadow), so
        // they add no height to the page.
        <div className="-mt-6 flex justify-center">
          <div className="relative flex">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Tarjeta ${index + 1} de ${slides.length}`}
                aria-current={index === active ? "true" : undefined}
                onClick={() => settleOn(index)}
                className="relative flex h-6 w-6 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
              >
                <span className="size-1.5 rounded-full bg-primary/20" />
              </button>
            ))}
            <DeckIndicator offset={offset} snaps={snaps} />
          </div>
        </div>
      )}
    </DeckDraggingContext.Provider>
  );
}

function clampToDeck(offset: number, maxOffset: number) {
  return Math.min(maxOffset, Math.max(0, offset));
}

/** The current-card pill over the dots: it slides with the deck, card by card. */
function DeckIndicator({
  offset,
  snaps,
}: {
  offset: MotionValue<number>;
  snaps: MotionValue<number[]>;
}) {
  const x = useTransform(
    () => snapProgress(offset.get(), snaps.get()) * DOT_PITCH_PX,
  );
  return (
    <m.span
      aria-hidden="true"
      data-testid="card-deck-dot"
      // Centered on the first dot (18px wide over a 24px button), then moved by `x`.
      className="pointer-events-none absolute top-[9px] left-[3px] h-1.5 w-[18px] rounded-full bg-primary"
      style={{ x }}
    />
  );
}

function DeckItem({
  index,
  offset,
  snaps,
  overshoot,
  reduced,
  children,
}: {
  index: number;
  offset: MotionValue<number>;
  snaps: MotionValue<number[]>;
  overshoot: MotionValue<number>;
  reduced: boolean;
  children: ReactNode;
}) {
  const distance = useTransform(() =>
    cardDistance(offset.get(), snaps.get(), index),
  );
  const scale = useTransform(distance, scaleAt);
  const opacity = useTransform(distance, opacityAt);

  return (
    <m.li
      className="w-[84%] shrink-0"
      // Reduced motion: no position-linked scaling; the fade alone marks the active card.
      style={{ x: overshoot, scale: reduced ? 1 : scale, opacity }}
    >
      {children}
    </m.li>
  );
}
