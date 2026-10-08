"use client";

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";

import { closeRowEntranceWindow } from "@/shared/ui/motion/row-entrance";

import {
  entranceTime,
  HOME_ENTERED,
  HOME_ENTERING,
  HOME_ENTRANCE_ANIMATIONS,
  type IntroDissolve,
} from "./home-entrance";

const noSubscription = () => () => {};

/**
 * True while React hydrates server HTML (the server snapshot), false on a client render:
 * whether this Home came with the document itself or arrived by a navigation.
 */
function useHydrating(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => false,
    () => true,
  );
}

function cssAnimations(): CSSAnimation[] {
  if (typeof document.getAnimations !== "function") return [];
  return document
    .getAnimations()
    .filter((animation) => animation instanceof CSSAnimation);
}

/** The brand intro's dissolve (see BrandIntro.tsx), if it is still on its timeline. */
function introDissolve(): IntroDissolve | null {
  const dissolve = cssAnimations().find(
    (animation) => animation.animationName === "brand-intro-dissolve",
  );
  if (!dissolve) return null;
  return {
    currentTime: Number(dissolve.currentTime ?? 0),
    delay: Number(dissolve.effect?.getTiming().delay ?? 0),
    finished: dissolve.playState === "finished",
  };
}

/**
 * Plays Home's entrance once per document (see home-entrance.ts), when the app opens:
 * - Home under the intro (a cold load, signing in): the entrance follows the intro's
 *   dissolve.
 * - Home in the document's own HTML once the intro is gone (it streamed in late): the
 *   entrance already started by CSS alone; it simply finishes.
 * - Home reached by a navigation inside the app: it is marked entered before the browser
 *   paints, so it never builds there.
 * When it is over, `HOME_ENTERED` turns it off for good: coming back to Home later shows
 * it settled, as a tab does. Renders nothing; the animations are CSS (globals.css), so
 * they also run before JavaScript arrives.
 */
export function HomeEntrance() {
  // Read on the first render only: it is a fact about how this Home arrived.
  const cameWithDocument = useRef(useHydrating());

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (root.hasAttribute(HOME_ENTERED)) return;
    const underIntro = document.querySelector(".brand-intro") !== null;
    if (!underIntro && !cameWithDocument.current) {
      root.setAttribute(HOME_ENTERED, "");
      return;
    }
    if (underIntro) root.setAttribute(HOME_ENTERING, "");
    // Next frame: BrandIntro (rendered after the page) has moved its dissolve by then.
    const frame = requestAnimationFrame(() => {
      const intro = introDissolve();
      const entrances = cssAnimations().filter((animation) =>
        HOME_ENTRANCE_ANIMATIONS.has(animation.animationName),
      );
      for (const animation of entrances) {
        animation.currentTime = entranceTime(
          Number(animation.currentTime ?? 0),
          intro,
        );
      }
      void Promise.allSettled(
        entrances.map((animation) => animation.finished),
      ).then(() => {
        root.setAttribute(HOME_ENTERED, "");
        root.removeAttribute(HOME_ENTERING);
        // Home's rows entered with it: lists that arrive later simply appear.
        void closeRowEntranceWindow();
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      root.removeAttribute(HOME_ENTERING);
    };
  }, []);

  return null;
}
