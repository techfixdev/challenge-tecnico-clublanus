"use client";

import { useEffect, ViewTransition, type ReactNode } from "react";

import { clientOnly, screenTransition, settleNavigation } from "./navigation";
import { watchFirstRowEntrance } from "./row-entrance";

const SCREEN = screenTransition({ placeholder: false });
const PLACEHOLDER = screenTransition({ placeholder: true });
const SKELETON_OUT = clientOnly("skeleton-out");
const REVEAL = clientOnly("reveal");

/**
 * Settles the list rows' own entrance (the CSS `row-enter` stagger, see globals.css) when
 * they arrive with a whole screen or a reveal: the view transition already moves them,
 * and a second, staggered fade inside a sliding screen reads as rows popping in late.
 * Only the first paint's rows stagger in at all (see row-entrance.ts).
 */
function settleRowEntrances() {
  if (typeof document.getAnimations !== "function") return;
  for (const animation of document.getAnimations()) {
    if (
      animation instanceof CSSAnimation &&
      animation.animationName === "row-enter"
    ) {
      animation.finish();
    }
  }
}

/**
 * One screen of the signed-in area, as a unit that moves on navigation (React
 * `<ViewTransition>`, activated by Next's navigations and by Suspense reveals). The type
 * of the navigation decides the motion (push, pop, instant tab switch, see navigation.ts);
 * the classes are styled in globals.css.
 *
 * It goes in each page.tsx and loading.tsx, never in a layout: a layout persists across
 * navigations, so enter and exit never fire there. The wrapper fills the column with the
 * page background, down to the bottom of the viewport (over the layout's room for the
 * nav, `--nav-clearance`, without changing the page's height), so a screen sliding in
 * covers the one underneath completely.
 *
 * - `placeholder`: a skeleton (loading.tsx). It moves like its screen on a navigation and
 *   fades out quickly when the content arrives, which then dissolves in (`reveal`).
 * - `default="none"`: unrelated transitions inside the screen (a search, a shared tile
 *   morph) never animate the whole screen.
 * - `onEnter`: the screen's rows arrive settled (see `settleRowEntrances`).
 * - Mounting starts watching for the first rows to enter (see row-entrance.ts).
 * - The announced navigation (see navigation.ts) is its untyped default, in case React
 *   dropped the types; mounting means the navigation landed, so it is settled here.
 */
export function ScreenTransition({
  placeholder = false,
  children,
}: {
  placeholder?: boolean;
  children: ReactNode;
}) {
  const { enter, exit } = placeholder ? PLACEHOLDER : SCREEN;
  // Mounted: the navigation landed (a later reveal of this screen is untyped again).
  useEffect(() => {
    settleNavigation();
    watchFirstRowEntrance();
  }, []);
  return (
    <ViewTransition
      enter={enter}
      exit={exit}
      default="none"
      onEnter={settleRowEntrances}
    >
      <div className="-mb-(--nav-clearance) flex flex-1 flex-col bg-background pb-(--nav-clearance)">
        {children}
      </div>
    </ViewTransition>
  );
}

/**
 * A Suspense fallback inside a screen: it fades out quickly when its content is ready.
 * Pair it with `RevealTransition` around the content of the same boundary.
 */
export function SkeletonTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition exit={SKELETON_OUT} default="none">
      {children}
    </ViewTransition>
  );
}

/**
 * Content that streams in after its skeleton: it dissolves in and rises 8px, after the
 * skeleton has left. When it arrives together with its screen (a prefetched navigation),
 * the screen's own motion runs instead: React animates only the outermost boundary.
 */
export function RevealTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={REVEAL} default="none" onEnter={settleRowEntrances}>
      {children}
    </ViewTransition>
  );
}
