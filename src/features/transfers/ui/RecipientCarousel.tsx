"use client";

import {
  animate,
  useMotionValue,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import {
  snapToStep,
  withEdgeResistance,
} from "@/shared/ui/gestures/drag-physics";
import { INSTANT, SPRING } from "@/shared/ui/motion/springs";
import { useReducedMotionPreference } from "@/shared/ui/reduced-motion";

import type { ConfirmedRecipient } from "../domain/transfer-form";
import { RecipientMonogram } from "./RecipientMonogram";
import { MaskedCvu } from "./TransferParts";

/**
 * Distance between two tiles' centers: the tile (`size-24`, 96px) plus the track's gap
 * (`gap-3`, 12px). The track is laid out by CSS, the drag math needs the number: keep
 * them in step.
 */
const TILE_STEP = 108;

/** A neighbor one step away from the center is drawn at 82%: it peeks, smaller. */
const NEIGHBOR_SCALE = 0.82;

/** How far (in steps) a caption stays readable: it is gone half way to the next tile. */
const CAPTION_REACH = 0.5;

const LISTBOX_LABEL_ID = "recent-recipients";

const optionId = (index: number) => `recent-recipient-${index}`;

/**
 * Recent recipients as a strip of initials tiles the finger drags sideways. The strip
 * follows the finger 1:1 (a motion value, no re-render per frame) and stretches past its
 * ends; on release it snaps to the tile the throw points at (`snapToStep`), settling on the
 * one critically damped spring at the finger's velocity. The centered tile is full size,
 * its neighbors peek smaller, and the name under it crossfades while scrubbing, all
 * derived from the strip's position.
 *
 * Settling on a tile chooses that person (`onSelect`); tapping a tile, or Enter on the
 * focused strip, goes on with them (`onPick`). Without a pointer it is a listbox: the
 * arrows move the selection, Home and End jump to the ends. Under reduced motion the
 * drag still works, but the strip jumps to the tile instead of gliding, and nothing
 * scales.
 */
export function RecipientCarousel({
  recipients,
  selectedQuery,
  onSelect,
  onPick,
  disabled,
}: {
  recipients: ConfirmedRecipient[];
  /** The query of the chosen person, if they are one of the recents. */
  selectedQuery: string | null;
  onSelect: (recipient: ConfirmedRecipient) => void;
  onPick: (recipient: ConfirmedRecipient) => void;
  disabled: boolean;
}) {
  const reduced = useReducedMotionPreference();
  const selectedIndex = recipients.findIndex(
    (recipient) => recipient.query === selectedQuery,
  );
  const [centered, setCentered] = useState(Math.max(selectedIndex, 0));
  // The strip's translation: 0 centers the first tile, -TILE_STEP the second.
  const offset = useMotionValue(-centered * TILE_STEP);
  const viewport = useRef<HTMLDivElement>(null);
  const panStart = useRef(0);
  // A drag ends with a click on the tile under the finger: it must not pick that tile.
  const dragged = useRef(false);

  const lastIndex = recipients.length - 1;

  // Typing a recent's alias in the field below chooses them too: the strip follows.
  const [followedIndex, setFollowedIndex] = useState(selectedIndex);
  if (selectedIndex !== followedIndex) {
    setFollowedIndex(selectedIndex);
    if (selectedIndex !== -1) setCentered(selectedIndex);
  }
  useEffect(() => {
    if (selectedIndex === -1 || offset.isAnimating()) return;
    const target = -selectedIndex * TILE_STEP;
    if (offset.get() !== target) {
      animate(offset, target, reduced ? INSTANT : SPRING);
    }
  }, [selectedIndex, offset, reduced]);

  /** Centers a tile, carrying the release velocity (px/s) into the settle. */
  function settleOn(index: number, velocity = 0) {
    setCentered(index);
    onSelect(recipients[index]);
    animate(
      offset,
      -index * TILE_STEP,
      reduced ? INSTANT : { ...SPRING, velocity },
    );
  }

  function handlePanStart() {
    dragged.current = true;
    offset.stop();
    panStart.current = offset.get();
  }

  function handlePan(_: PointerEvent, info: PanInfo) {
    offset.set(
      withEdgeResistance(
        panStart.current + info.offset.x,
        -lastIndex * TILE_STEP,
        0,
        viewport.current?.clientWidth ?? TILE_STEP * 3,
      ),
    );
  }

  function handlePanEnd(_: PointerEvent, info: PanInfo) {
    settleOn(
      snapToStep(offset.get(), info.velocity.x, TILE_STEP, recipients.length),
      info.velocity.x,
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = {
      ArrowRight: Math.min(centered + 1, lastIndex),
      ArrowLeft: Math.max(centered - 1, 0),
      Home: 0,
      End: lastIndex,
    }[event.key];
    if (target !== undefined) {
      event.preventDefault();
      settleOn(target);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && !disabled) {
      event.preventDefault();
      settleOn(centered);
      onPick(recipients[centered]);
    }
  }

  function handleTileClick(index: number) {
    if (dragged.current || disabled) return;
    settleOn(index);
    onPick(recipients[index]);
  }

  return (
    <section aria-labelledby={LISTBOX_LABEL_ID} className="mt-8">
      <h2
        id={LISTBOX_LABEL_ID}
        className="text-base font-medium text-foreground"
      >
        Recientes
      </h2>
      <m.div
        ref={viewport}
        role="listbox"
        aria-labelledby={LISTBOX_LABEL_ID}
        aria-orientation="horizontal"
        aria-activedescendant={optionId(centered)}
        aria-disabled={disabled || undefined}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDownCapture={() => (dragged.current = false)}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        // The page still scrolls vertically through the strip; only sideways is ours.
        // Bleeds to the screen edges, so the neighbors peek from under them.
        data-gesture-viewport=""
        className="relative -mx-6 mt-4 h-28 cursor-grab touch-pan-y overflow-hidden select-none focus-visible:outline-none active:cursor-grabbing"
      >
        <m.div
          style={{ x: offset }}
          className="absolute top-2 left-1/2 -ml-12 flex gap-3"
        >
          {recipients.map((recipient, index) => (
            <CarouselTile
              key={recipient.query}
              recipient={recipient}
              index={index}
              offset={offset}
              reduced={reduced}
              isSelected={index === selectedIndex}
              isCentered={index === centered}
              onClick={() => handleTileClick(index)}
            />
          ))}
        </m.div>
      </m.div>
      <div aria-hidden="true" className="relative mt-3 grid text-center">
        {recipients.map((recipient, index) => (
          <CarouselCaption
            key={recipient.query}
            recipient={recipient}
            index={index}
            offset={offset}
          />
        ))}
      </div>
    </section>
  );
}

/** How many steps tile `index` is from the center (signed, fractional while dragging). */
function useStepsFromCenter(offset: MotionValue<number>, index: number) {
  return useTransform(offset, (x) => Math.abs(x / TILE_STEP + index));
}

function CarouselTile({
  recipient,
  index,
  offset,
  reduced,
  isSelected,
  isCentered,
  onClick,
}: {
  recipient: ConfirmedRecipient;
  index: number;
  offset: MotionValue<number>;
  reduced: boolean;
  isSelected: boolean;
  isCentered: boolean;
  onClick: () => void;
}) {
  const steps = useStepsFromCenter(offset, index);
  const scale = useTransform(steps, [0, 1], [1, NEIGHBOR_SCALE]);
  const opacity = useTransform(steps, [0, 1, 2], [1, 0.6, 0.3]);
  return (
    <m.div
      id={optionId(index)}
      role="option"
      aria-selected={isSelected}
      aria-label={`${recipient.fullName}${recipient.alias ? `, ${recipient.alias}` : ""}`}
      onClick={onClick}
      data-centered={isCentered || undefined}
      // Reduced motion: no position-linked scaling; the fade alone marks the center.
      style={{ scale: reduced ? 1 : scale, opacity }}
      // The strip has the focus; the ring shows on the tile Enter would pick.
      className="rounded-3xl ring-primary/40 ring-offset-2 ring-offset-background data-centered:in-focus-visible:ring-4"
    >
      <RecipientMonogram
        // Motion registers a shared element when it mounts: a tile that becomes the
        // chosen one remounts its avatar, so the avatar can travel into the header.
        key={isSelected ? "chosen" : "idle"}
        fullName={recipient.fullName}
        size="tile"
        tone={isSelected ? "chosen" : index}
        morph={isSelected}
      />
    </m.div>
  );
}

/**
 * Name and alias under the strip. Every caption sits in the same cell and fades with its
 * tile's distance from the center, so scrubbing crossfades them. Visual only: each tile
 * carries its own accessible name.
 */
function CarouselCaption({
  recipient,
  index,
  offset,
}: {
  recipient: ConfirmedRecipient;
  index: number;
  offset: MotionValue<number>;
}) {
  const steps = useStepsFromCenter(offset, index);
  const opacity = useTransform(steps, [0, CAPTION_REACH], [1, 0]);
  return (
    <m.p
      style={{ opacity }}
      className="col-start-1 row-start-1 flex flex-col items-center px-6"
    >
      <span className="text-[15px] font-medium break-words text-foreground">
        {recipient.fullName}
      </span>
      <span className="text-xs text-muted">
        {recipient.alias}
        {recipient.alias && recipient.cvuMasked ? " · " : null}
        {recipient.cvuMasked ? (
          <MaskedCvu cvuMasked={recipient.cvuMasked} />
        ) : null}
      </span>
    </m.p>
  );
}
