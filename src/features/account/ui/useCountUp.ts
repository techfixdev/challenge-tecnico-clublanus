"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { prefersReducedMotion } from "@/shared/ui/reduced-motion";

import { COUNT_UP_MS, countUpFrame } from "./count-up";

const subscribeToNothing = () => () => {};

/**
 * `true` when the component mounts on the client (e.g. navigating to Home after login),
 * `false` on the server and while hydrating server HTML.
 */
function useMountedOnClient(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

/**
 * The balance text, counting up from 0 on mount (`COUNT_UP_MS`, ease-out).
 *
 * It only counts when the component mounts on the client. Server-rendered HTML already
 * shows the real balance, and replaying from 0 after hydration would flash
 * "978.85 → 0 → 978.85". Under reduced motion it shows the final value at once.
 */
export function useCountUp(balance: string): string {
  const mountedOnClient = useMountedOnClient();
  const [animate] = useState(() => mountedOnClient && !prefersReducedMotion());
  const [elapsedMs, setElapsedMs] = useState(animate ? 0 : Infinity);

  useEffect(() => {
    if (!animate) return;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now: number) {
      const elapsed = now - start;
      setElapsedMs(elapsed);
      if (elapsed < COUNT_UP_MS) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [animate]);

  return countUpFrame(balance, elapsedMs);
}
