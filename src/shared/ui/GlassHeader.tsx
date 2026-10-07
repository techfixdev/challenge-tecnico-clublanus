"use client";

import { useScroll, useTransform } from "motion/react";
import { useRef, ViewTransition, type ReactNode } from "react";

import { COMPACT_TITLE_SCALE, headerCollapsePx } from "./glass-header";
import { PINNED_CHROME } from "./motion/navigation";
import { useBoundStyle } from "./motion/use-bound-style";
import { useReducedMotionPreference } from "./reduced-motion";

const scaleTransform = (scale: number) =>
  scale === 1 ? "none" : `scale(${scale})`;

/**
 * Screen header that compacts on scroll, iOS large-title style: the eyebrow ("Hola")
 * fades, the title shrinks to 85% and the bar turns into frosted glass with a hairline.
 *
 * Every value is derived from the scroll position with `useScroll` + `useTransform`
 * (motion values, no React re-render per frame) and written straight into the elements'
 * style (`useBoundStyle`, which also applies a scroll made before Motion's lazy renderer
 * loaded), so it follows the finger exactly and reverses when scrolling back. The header
 * never changes its height in the flow: it sticks with a negative `top`, so the content
 * below never shifts. Under reduced motion the title does not scale; the glass still
 * fades in.
 *
 * During navigation the header is pinned chrome (view-transition name `screen-header`):
 * when the next screen has a header too (Inicio ↔ Movimientos), it stays in place and
 * only its contents crossfade, while the screens slide or fade underneath.
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

  const backdrop = useRef<HTMLDivElement>(null);
  const eyebrowLine = useRef<HTMLParagraphElement>(null);
  const titleLine = useRef<HTMLHeadingElement>(null);
  const actionsBox = useRef<HTMLDivElement>(null);
  useBoundStyle(backdrop, glass, (style, value) => {
    style.opacity = String(value);
  });
  useBoundStyle(eyebrowLine, eyebrowOpacity, (style, value) => {
    style.opacity = String(value);
  });
  useBoundStyle(
    titleLine,
    titleScale,
    (style, value) => {
      style.transform = reduced ? "none" : scaleTransform(value);
    },
    [reduced],
  );
  useBoundStyle(actionsBox, actionsY, (style, value) => {
    style.transform = value === 0 ? "none" : `translateY(${value}px)`;
  });

  return (
    <ViewTransition
      name={PINNED_CHROME.header}
      share={PINNED_CHROME.header}
      default="none"
    >
      <header
        data-testid="glass-header"
        data-pinned-chrome
        className="sticky z-10 px-6 pt-10 pb-3"
        style={{ top: `calc(env(safe-area-inset-top) - ${collapse}px)` }}
      >
        {/* The glass also covers the status-bar area above the header (safe area). */}
        <div
          ref={backdrop}
          aria-hidden="true"
          data-testid="glass-header-backdrop"
          className="absolute inset-x-0 top-[calc(-1*env(safe-area-inset-top))] bottom-0 -z-10 glass"
          style={{ opacity: 0 }}
        >
          {hairline && (
            <span className="absolute inset-x-0 bottom-0 h-px bg-border" />
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          {/* Under extreme page zoom a long name breaks rather than pushing the actions out. */}
          <div className="min-w-0">
            {eyebrow && (
              <p
                ref={eyebrowLine}
                className="text-xs text-muted"
                style={{ opacity: 1 }}
              >
                {eyebrow}
              </p>
            )}
            <h1
              ref={titleLine}
              data-testid="glass-header-title"
              className="origin-left font-display text-[22px] font-semibold wrap-anywhere text-foreground"
              style={{ transform: "none" }}
            >
              {title}
            </h1>
          </div>
          {actions && (
            <div
              ref={actionsBox}
              className="flex shrink-0 items-center gap-1"
              style={{ transform: "none" }}
            >
              {actions}
            </div>
          )}
        </div>
      </header>
    </ViewTransition>
  );
}
