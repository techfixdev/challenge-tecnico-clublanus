"use client";

import {
  animate,
  useMotionValue,
  type AnimationPlaybackControls,
} from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { announceNavigation, POP } from "../motion/navigation";
import { INSTANT, SPRING } from "../motion/springs";
import { useBoundStyle } from "../motion/use-bound-style";
import { useReducedMotionPreference } from "../reduced-motion";
import { dragProgress, EDGE_ZONE_PX, shouldCompleteBack } from "./drag-physics";
import { useAxisDrag } from "./use-axis-drag";

/**
 * How dark the screen underneath is while covered: black at 8% over it darkens it
 * exactly as `--motion-push-dim` (brightness 0.92) dims the screen a push covers.
 */
const COVERED_SCREEN_DIM = 0.08;

/**
 * iOS's interactive swipe back, for a screen pushed above a tab (a movement's detail,
 * Recibir). A drag that starts at the screen's left edge moves the screen to the right
 * with the finger, 1:1, over a dim shade standing in for the previous screen (the real
 * one is another route, not rendered yet), which lightens as the screen uncovers it.
 *
 * Releasing past 35% of the width, or flicking right, goes `back` like the NavBar's
 * "Volver", with the same transition types: the navigation's view transition picks the
 * screen up where the finger left it and finishes the pop (or, for a quick action, the
 * shrink into its Home tile), so the screen never travels twice. Meanwhile it keeps
 * going on the spring with the finger's velocity, in case the destination is slow to
 * land. Releasing short of it springs back (critically damped, no bounce).
 *
 * Only a horizontal drag from the edge is taken: a vertical one scrolls the page as
 * usual. On iOS Safari the browser's own edge swipe (history back) may win a press that
 * starts at the very edge; then this gesture simply never starts, and Safari goes back.
 * The chevron and the keyboard remain the way back that never depends on a gesture.
 * Under reduced motion the screen still follows the finger, but nothing travels on its
 * own: a completed swipe navigates at once and a cancelled one snaps back.
 *
 * Opt-in per screen: wrap the screen's content, directly inside its ScreenTransition (it
 * is the wrapper's parent that turns see-through while the screen is swiped away).
 */
export function EdgeSwipeBack({
  back,
  children,
}: {
  /** Where "Volver" goes: the same destination and types as the screen's NavBar. */
  back: { href: string; transitionTypes?: string[] };
  children: ReactNode;
}) {
  const router = useRouter();
  const reduced = useReducedMotionPreference();
  const frame = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const offset = useMotionValue(0);
  const width = useRef(0);
  const leaving = useRef(false);
  const travel = useRef<AnimationPlaybackControls | null>(null);

  useBoundStyle(screen, offset, (style, x) => {
    // No transform at rest: it would make the screen the containing block of anything
    // fixed inside it.
    style.transform = x === 0 ? "" : `translate3d(${x}px, 0, 0)`;
  });
  useBoundStyle(shade, offset, (style, x) => {
    const uncovered = leaving.current ? 1 : dragProgress(x, width.current);
    style.opacity = String(COVERED_SCREEN_DIM * (1 - uncovered));
  });

  // A screen shown again (kept by the router, or by the browser's back/forward cache)
  // starts at rest, whatever state it was left in.
  useEffect(() => {
    leaving.current = false;
    offset.jump(0);
    return () => travel.current?.stop();
  }, [offset]);

  function springTo(target: number, velocity: number, onComplete?: () => void) {
    travel.current?.stop();
    // `onComplete` only runs when the spring arrives, never when a new drag stops it.
    travel.current = animate(offset, target, {
      ...(reduced ? INSTANT : { ...SPRING, velocity }),
      onComplete,
    });
  }

  function settle(velocity: number) {
    springTo(0, velocity, () => {
      delete frame.current?.dataset.swiping;
    });
  }

  function goBack(velocity: number) {
    leaving.current = true;
    // The shade goes now: the view transition's snapshot of this screen must show
    // nothing beside it, or the pop would slide a dark band over the incoming screen.
    if (shade.current) shade.current.style.opacity = "0";
    if (!reduced) springTo(width.current, velocity);
    const types = back.transitionTypes ?? POP;
    announceNavigation(types);
    router.push(back.href, { transitionTypes: types });
  }

  useAxisDrag(screen, {
    axis: "x",
    startDirection: "positive",
    canStart: (event) => {
      const element = frame.current;
      if (!element || leaving.current) return false;
      return (
        event.clientX - element.getBoundingClientRect().left <= EDGE_ZONE_PX
      );
    },
    onStart: () => {
      travel.current?.stop();
      width.current = frame.current?.offsetWidth ?? 0;
      if (frame.current) frame.current.dataset.swiping = "";
    },
    onMove: (dx) => offset.set(Math.max(0, dx)),
    onRelease: (dx, velocity) => {
      if (shouldCompleteBack(dx, velocity, width.current)) goBack(velocity);
      else settle(velocity);
    },
    onCancel: () => settle(0),
  });

  return (
    <div ref={frame} className="edge-swipe relative flex flex-1 flex-col">
      <div
        ref={shade}
        aria-hidden="true"
        data-testid="edge-swipe-shade"
        className="edge-swipe-shade pointer-events-none absolute inset-0"
        style={{ opacity: COVERED_SCREEN_DIM }}
      />
      <div
        ref={screen}
        data-testid="edge-swipe-screen"
        className="edge-swipe-screen relative flex flex-1 flex-col bg-background"
      >
        {children}
      </div>
    </div>
  );
}
