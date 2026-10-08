/*
 * Taps on pinned chrome during a view transition.
 *
 * The bottom nav and the screen header carry their own view-transition names, so they
 * stay put while screens move. The price: while a transition runs, the browser skips
 * named elements when hit testing, so a tap on a nav item lands on whatever lies under
 * it (a movement row, the page padding). The tap would be lost, or worse, open a movement
 * the user never meant to. This guard catches such a fall-through tap (a real tap whose
 * point is inside pinned chrome but whose target is not), never lets it reach the page,
 * and hands it to the chrome's control under that point instead.
 *
 * Pinned chrome is marked with `data-pinned-chrome`. Keyboard clicks (`detail: 0`) carry
 * no meaningful point and are left alone, as is every tap outside a known transition.
 */

const CHROME_SELECTOR = "[data-pinned-chrome]";
const CONTROL_SELECTOR = "a[href], button:not(:disabled)";

function containsPoint(rect: DOMRect, x: number, y: number) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/**
 * Whether a view transition runs. A browser that cannot tell (no
 * `document.activeViewTransition`, e.g. Safari and Firefox today) counts as "no": the
 * guard would otherwise steal taps from anything drawn over the chrome. There, a tap
 * during the ~400ms transition may be lost instead, as on iOS.
 */
function transitionActive(doc: Document) {
  return (
    (doc as Document & { activeViewTransition?: unknown })
      .activeViewTransition != null
  );
}

/** Installs the guard on `doc`; returns the function that removes it. */
export function installPinnedChromeTaps(doc: Document = document) {
  const onClick = (event: MouseEvent) => {
    if (event.detail === 0 || !transitionActive(doc)) return;
    const target = event.target instanceof Node ? event.target : null;
    const chrome = [...doc.querySelectorAll<HTMLElement>(CHROME_SELECTOR)];
    if (target && chrome.some((element) => element.contains(target))) return;

    const { clientX: x, clientY: y } = event;
    const hit = chrome.find((element) =>
      containsPoint(element.getBoundingClientRect(), x, y),
    );
    if (!hit) return;

    event.preventDefault();
    event.stopPropagation();
    const control = [
      ...hit.querySelectorAll<HTMLElement>(CONTROL_SELECTOR),
    ].find((element) => containsPoint(element.getBoundingClientRect(), x, y));
    control?.click();
  };
  doc.addEventListener("click", onClick, true);
  return () => doc.removeEventListener("click", onClick, true);
}
