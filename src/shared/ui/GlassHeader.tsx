"use client";

import { useScroll, useTransform } from "motion/react";
import * as m from "motion/react-m";
import type { ReactNode } from "react";

import { COMPACT_TITLE_SCALE, headerCollapsePx } from "./glass-header";
import { useReducedMotionPreference } from "./reduced-motion";

/**
 * Screen header that compacts on scroll, iOS large-title style: the eyebrow ("Hola")
 * fades, the title shrinks to 85% and the bar turns into frosted glass with a hairline.
 *
 * Every value is derived from the scroll position with `useScroll` + `useTransform`
 * (motion values, no React re-render per frame), so it follows the finger exactly and
 * reverses when scrolling back. The header never changes its height in the flow: it
 * sticks with a negative `top`, so the content below never shifts.
 * Under reduced motion the title does not scale; the glass still fades in.
 */
export function GlassHeader({
  title,
  eyebrow,
  actions,
  hairline = true,
}: {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  /** Off when something sticks right under the header and draws its own edge. */
  hairline?: boolean;
}) {
  const reduced = useReducedMotionPreference();
  const collapse = headerCollapsePx(Boolean(eyebrow));
  const { scrollY } = useScroll();
  const progress = useTransform(scrollY, [0, collapse], [0, 1]);
  const glass = useTransform(scrollY, [collapse - 12, collapse + 4], [0, 1]);
  const eyebrowOpacity = useTransform(scrollY, [0, collapse * 0.6], [1, 0]);
  const titleScale = useTransform(progress, [0, 1], [1, COMPACT_TITLE_SCALE]);
  // With an eyebrow, the actions sit lower once the eyebrow line has scrolled away.
  const actionsY = useTransform(progress, [0, 1], [0, eyebrow ? 8 : 0]);

  return (
    <header
      data-testid="glass-header"
      className="sticky z-10 px-6 pt-10 pb-3"
      style={{ top: `calc(env(safe-area-inset-top) - ${collapse}px)` }}
    >
      {/* The glass also covers the status-bar area above the header (safe area). */}
      <m.div
        aria-hidden="true"
        data-testid="glass-header-backdrop"
        className="absolute inset-x-0 top-[calc(-1*env(safe-area-inset-top))] bottom-0 -z-10 glass"
        style={{ opacity: glass }}
      >
        {hairline && (
          <span className="absolute inset-x-0 bottom-0 h-px bg-border" />
        )}
      </m.div>
      <div className="flex items-center justify-between">
        <div>
          {eyebrow && (
            <m.p
              className="text-xs text-muted"
              style={{ opacity: eyebrowOpacity }}
            >
              {eyebrow}
            </m.p>
          )}
          <m.h1
            data-testid="glass-header-title"
            className="origin-left text-xl font-semibold text-foreground"
            style={{ scale: reduced ? 1 : titleScale }}
          >
            {title}
          </m.h1>
        </div>
        {actions && (
          <m.div className="flex items-center gap-1" style={{ y: actionsY }}>
            {actions}
          </m.div>
        )}
      </div>
    </header>
  );
}
