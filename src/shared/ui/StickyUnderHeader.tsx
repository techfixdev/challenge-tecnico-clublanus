"use client";

import { useScroll, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useRef, type ReactNode } from "react";

import { COMPACT_HEADER_PX } from "./glass-header";

/**
 * Controls that stick right under the compact GlassHeader (e.g. search and filters on
 * Movements) and join its glass once stuck, so header and controls read as one bar.
 * A sentinel just above the block tells, on every scroll frame, whether it is stuck;
 * reading its position keeps working when content above it (the month summary)
 * streams in and changes height.
 */
export function StickyUnderHeader({ children }: { children: ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  // 1px higher than the header's bottom edge, so the block covers the seam.
  const stickTop = COMPACT_HEADER_PX - 1;
  const stuck = useTransform(() => {
    scrollY.get();
    const top = sentinel.current?.getBoundingClientRect().top;
    if (top === undefined) return 0;
    return Math.min(1, Math.max(0, (stickTop - top) / 8));
  });

  return (
    <>
      <div ref={sentinel} aria-hidden="true" className="-mb-5 h-0" />
      <div
        data-testid="sticky-filters"
        className="sticky z-10 -mx-6 flex flex-col gap-5 px-6"
        style={{ top: `calc(env(safe-area-inset-top) + ${stickTop}px)` }}
      >
        <m.div
          aria-hidden="true"
          data-testid="sticky-filters-backdrop"
          className="absolute inset-x-0 -top-px bottom-0 -z-10 glass"
          style={{ opacity: stuck }}
        >
          <span className="absolute inset-x-0 bottom-0 h-px bg-border" />
        </m.div>
        {children}
      </div>
    </>
  );
}
