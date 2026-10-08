import type { MotionValue } from "motion/react";
import { useLayoutEffect, type RefObject } from "react";

/**
 * Writes a motion value into an element's inline style, now and on every change.
 *
 * Why not `<m.div style={{ opacity: value }}>`: in the signed-in area Motion's renderer is
 * lazy (LazyMotion loads it after hydration). Until it arrives, an `m.*` element only has
 * the style of its first render, and when the renderer does arrive it starts from those
 * stale values again; it only catches up when the value changes once more. A scroll made
 * meanwhile (the page restored scrolled, a quick swipe after a slow load) was lost: the
 * header stayed transparent at 200px down until the next scroll crossed its threshold.
 * Scroll-linked styles do not need the renderer at all, so they bind directly: the
 * current value is applied on mount and every change after it, deterministically.
 *
 * The element should render the value's resting state inline (for the server HTML).
 * `deps`: whatever `apply` reads besides the value (it is re-applied when they change).
 */
export function useBoundStyle<T>(
  ref: RefObject<HTMLElement | null>,
  value: MotionValue<T>,
  apply: (style: CSSStyleDeclaration, latest: T) => void,
  deps: readonly unknown[] = [],
) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    apply(element.style, value.get());
    return value.on("change", (latest) => apply(element.style, latest));
    // `apply` is re-created every render; what it depends on is listed in `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, value, ...deps]);
}
