"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { prefersReducedMotion } from "./reduced-motion";

/** CSS animations of the intro that start its dissolve (see globals.css). */
const DISSOLVE_ANIMATIONS = new Set([
  "brand-intro-dissolve",
  "brand-intro-handoff",
]);

/**
 * Branded intro on a cold load of the signed-in area: the club's shield rises into place
 * and hands off to the screen (styled in globals.css, `.brand-intro`). The shield comes
 * in as `children`, rendered on the server, so its vector is in the HTML (it paints with
 * no request) and not in this component's JavaScript.
 *
 * It lives in the signed-in layout, which mounts once per document (a hard load) or when
 * signing in (login → Home); client navigations keep the layout, so it never plays again.
 * It must never delay the screen, which renders underneath the whole time:
 * - taps go through it (`pointer-events: none`), and it holds no text or image (the
 *   shield is inline vector paths), so it is never the page's largest contentful paint;
 * - CSS alone dissolves it by ~600ms after its first paint, even if JavaScript is late;
 * - once React has hydrated (the screen is interactive) it starts dissolving right away;
 * - reduced motion hides it (CSS) and drops it at once.
 * After the dissolve it unmounts.
 */
export function BrandIntro({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const intro = ref.current;
    if (!intro) return;
    if (prefersReducedMotion() || typeof intro.getAnimations !== "function") {
      setDone(true);
      return;
    }
    // Hydrated: jump the dissolve to its start if it has not begun yet. Moving the
    // timeline (instead of restarting an animation) keeps it continuous.
    for (const animation of intro.getAnimations({ subtree: true })) {
      if (!(animation instanceof CSSAnimation)) continue;
      if (!DISSOLVE_ANIMATIONS.has(animation.animationName)) continue;
      const delay = Number(animation.effect?.getTiming().delay ?? 0);
      if (Number(animation.currentTime ?? 0) < delay) {
        animation.currentTime = delay;
      }
    }
  }, []);

  if (done) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-testid="brand-intro"
      className="brand-intro"
      onAnimationEnd={(event) => {
        if (event.animationName === "brand-intro-dissolve") setDone(true);
      }}
    >
      <span className="brand-intro-mark">{children}</span>
    </div>
  );
}
