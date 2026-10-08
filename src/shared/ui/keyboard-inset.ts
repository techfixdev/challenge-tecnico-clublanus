"use client";

import { useEffect, useState } from "react";

/**
 * How much of the layout viewport the on-screen keyboard covers, in CSS pixels. Mobile
 * browsers shrink only the visual viewport when the keyboard opens (iOS Safari, and
 * Chrome on Android by default), so an element pinned to the bottom of the layout
 * viewport (`position: sticky; bottom: 0`) ends up behind the keyboard; lifting it by
 * this much keeps it right above the keys. Zero while pinch-zoomed: the visual viewport
 * is smaller then for another reason, and nothing needs to move.
 */
export function keyboardInset({
  layoutHeight,
  height,
  offsetTop,
  scale,
}: {
  layoutHeight: number;
  height: number;
  offsetTop: number;
  scale: number;
}): number {
  if (scale > 1.01) return 0;
  const covered = layoutHeight - height - offsetTop;
  // Below a pixel it is rounding, not a keyboard.
  return covered >= 1 ? Math.round(covered) : 0;
}

function readInset(): number {
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  return keyboardInset({
    layoutHeight: window.innerHeight,
    height: viewport.height,
    offsetTop: viewport.offsetTop,
    scale: viewport.scale,
  });
}

/**
 * The keyboard inset, kept up to date from the visual viewport (0 on the server, before
 * hydration and where the browser has no visual viewport).
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setInset(readInset());
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}
