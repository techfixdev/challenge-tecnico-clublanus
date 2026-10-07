"use client";

import { useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

import { ChevronLeftIcon } from "./icons";
import { POP } from "./motion/navigation";
import { MotionLink } from "./motion/MotionLink";
import { useBoundStyle } from "./motion/use-bound-style";

/**
 * Where the chevron goes: a real link up the hierarchy (it works on a fresh tab or a shared
 * URL too, unlike `history.back()`), or a handler for a step back inside one screen.
 *
 * The link pops by default (`nav-back`: this screen slides out to the right); a quick
 * action's screen passes `quick-action-close` instead, to shrink back into its Home tile.
 */
export type NavBarBack =
  { href: string; transitionTypes?: string[] } | { onBack: () => void };

/**
 * Pushed screens start the bar 32px from the top (`pt-8`): the glass fades in over the
 * last 12px of scroll before the bar reaches the top and sticks.
 */
const GLASS_SCROLL_RANGE = [20, 32];

const BACK_CLASSES =
  "-ml-3 inline-flex size-11 pressable items-center justify-center rounded-full text-foreground hover:text-primary focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none";

function BackControl({ back }: { back: NavBarBack }) {
  const chevron = <ChevronLeftIcon className="size-6" />;
  if ("onBack" in back) {
    return (
      <button
        type="button"
        onClick={back.onBack}
        aria-label="Volver"
        className={BACK_CLASSES}
      >
        {chevron}
      </button>
    );
  }
  // `prefetch` loads the whole destination (not only its loading skeleton) while this
  // screen is open, so going back lands in a single commit: the list appears at once and a
  // shared element (a movement's tile, a quick action's container) can morph back into it.
  return (
    <MotionLink
      href={back.href}
      prefetch
      transitionTypes={back.transitionTypes ?? POP}
      aria-label="Volver"
      className={BACK_CLASSES}
    >
      {chevron}
    </MotionLink>
  );
}

/**
 * iOS-style navigation bar for screens pushed above a tab (movement detail, the send flow,
 * Recibir): a bare back chevron (a 44×44 target named "Volver"), the screen's short title
 * centered, and an optional trailing slot (e.g. "Paso 1 de 3").
 *
 * The title is plain text, not a heading: the screen keeps its own h1 below (the
 * counterparty, the step), which is what a screen reader should land on.
 *
 * It sticks to the top while the page scrolls and turns into the same frosted glass as the
 * tab screens' header (`GlassHeader`) once content passes under it; at rest it has no
 * surface at all. The glass follows the scroll position (a motion value written straight to
 * the style, no re-render per frame), so it needs no timing of its own. It sits inside the
 * screen's `px-6` column and bleeds to the edges with `-mx-6`.
 */
export function NavBar({
  title,
  back,
  trailing,
}: {
  title: string;
  back: NavBarBack;
  trailing?: ReactNode;
}) {
  const { scrollY } = useScroll();
  const glass = useTransform(scrollY, GLASS_SCROLL_RANGE, [0, 1]);
  const backdrop = useRef<HTMLDivElement>(null);
  useBoundStyle(backdrop, glass, (style, value) => {
    style.opacity = String(value);
  });

  return (
    <div
      data-testid="nav-bar"
      className="sticky top-[env(safe-area-inset-top)] z-10 -mx-6 px-6"
    >
      {/* The glass also covers the status-bar area above the bar (safe area). */}
      <div
        ref={backdrop}
        aria-hidden="true"
        data-testid="nav-bar-backdrop"
        className="absolute inset-x-0 top-[calc(-1*env(safe-area-inset-top))] bottom-0 -z-10 glass"
        style={{ opacity: 0 }}
      >
        <span className="absolute inset-x-0 bottom-0 h-px bg-border" />
      </div>
      {/* Equal side columns keep the title centered whatever the trailing slot holds. */}
      <div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex">
          <BackControl back={back} />
        </div>
        <p
          data-testid="nav-bar-title"
          className="truncate font-display text-[17px] font-semibold text-foreground"
        >
          {title}
        </p>
        <div className="flex justify-end">{trailing}</div>
      </div>
    </div>
  );
}
