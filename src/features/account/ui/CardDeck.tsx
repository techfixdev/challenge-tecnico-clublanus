"use client";

import {
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { INDICATOR_SPRING, INSTANT } from "@/shared/ui/motion/springs";
import { useReducedMotionPreference } from "@/shared/ui/reduced-motion";

import {
  cardDistance,
  measureSnaps,
  nearestCard,
  opacityAt,
  scaleAt,
} from "./card-deck";

export type DeckSlide = { id: string; content: ReactNode };

/**
 * Card carousel. Scrolling stays native (CSS scroll-snap: momentum, keyboard, screen
 * readers), and Motion only *reads* the scroll position: each card's scale and opacity
 * are derived from it frame by frame, so the next card grows into place while the
 * finger is still moving. The dots below are buttons that scroll to a card.
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
  const { scrollX } = useScroll({ container: listRef });
  const snaps = useMotionValue<number[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () =>
      snaps.set(
        measureSnaps(
          Array.from(list.children, (item) => (item as HTMLElement).offsetLeft),
          list.scrollWidth - list.clientWidth,
        ),
      );
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [snaps]);

  // React state changes only when the active card changes, never per scroll frame.
  useMotionValueEvent(scrollX, "change", (scroll) => {
    const next = nearestCard(scroll, snaps.get());
    if (next !== active) setActive(next);
  });

  function scrollToCard(index: number) {
    listRef.current?.scrollTo({
      left: snaps.get()[index] ?? 0,
      behavior: reduced ? "instant" : "smooth",
    });
  }

  return (
    <div>
      <ul
        ref={listRef}
        aria-label={label}
        tabIndex={0}
        className="flex snap-x snap-mandatory scroll-px-6 [scrollbar-width:none] gap-4 overflow-x-auto px-6 pt-2 pb-8 focus-visible:outline-none"
      >
        {slides.map((slide, index) => (
          <DeckItem
            key={slide.id}
            index={index}
            scroll={scrollX}
            snaps={snaps}
            reduced={reduced}
          >
            {slide.content}
          </DeckItem>
        ))}
      </ul>
      {slides.length > 1 && (
        <div className="-mt-5 flex justify-center">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Tarjeta ${index + 1} de ${slides.length}`}
              aria-current={index === active ? "true" : undefined}
              onClick={() => scrollToCard(index)}
              className="relative flex h-6 w-6 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              <span className="size-1.5 rounded-full bg-primary/20" />
              {index === active && (
                <m.span
                  layoutId="card-deck-dot"
                  data-testid="card-deck-dot"
                  className="absolute h-1.5 w-[18px] rounded-full bg-primary"
                  transition={reduced ? INSTANT : INDICATOR_SPRING}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DeckItem({
  index,
  scroll,
  snaps,
  reduced,
  children,
}: {
  index: number;
  scroll: MotionValue<number>;
  snaps: MotionValue<number[]>;
  reduced: boolean;
  children: ReactNode;
}) {
  const distance = useTransform(() =>
    cardDistance(scroll.get(), snaps.get(), index),
  );
  const scale = useTransform(distance, scaleAt);
  const opacity = useTransform(distance, opacityAt);

  return (
    <m.li
      className="w-[84%] shrink-0 snap-start"
      // Reduced motion: no scroll-linked scaling; the fade alone marks the active card.
      style={{ scale: reduced ? 1 : scale, opacity }}
    >
      {children}
    </m.li>
  );
}
