import { afterEach, describe, expect, it, vi } from "vitest";

import { installPinnedChromeTaps } from "./pinned-chrome-taps";

function rect(left: number, top: number, width: number, height: number) {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

/** A pinned nav (0,700 → 390,780) with one link, over page content with its own link. */
function setUp() {
  document.body.innerHTML = `
    <a id="row" href="/movimientos/1">Row under the nav</a>
    <nav data-pinned-chrome><a id="tab" href="/movimientos">Movimientos</a></nav>
  `;
  const nav = document.querySelector("nav")!;
  const tab = document.querySelector<HTMLAnchorElement>("#tab")!;
  const row = document.querySelector<HTMLAnchorElement>("#row")!;
  nav.getBoundingClientRect = () => rect(0, 700, 390, 80);
  tab.getBoundingClientRect = () => rect(100, 710, 56, 56);
  row.getBoundingClientRect = () => rect(0, 650, 390, 120);
  return { tab, row };
}

/** A real tap (`detail: 1`) at (x, y) whose hit test landed on `target`. */
function tap(target: Element, x: number, y: number) {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    detail: 1,
  });
  target.dispatchEvent(event);
  return event;
}

/** `document.activeViewTransition` as the browser reports it; `"unsupported"` removes it. */
function setActiveTransition(value: object | null | "unsupported") {
  if (value === "unsupported") {
    Reflect.deleteProperty(document, "activeViewTransition");
    return;
  }
  Object.defineProperty(document, "activeViewTransition", {
    value,
    configurable: true,
  });
}

let uninstall: () => void = () => {};
afterEach(() => {
  uninstall();
  setActiveTransition("unsupported");
  document.body.innerHTML = "";
});

describe("installPinnedChromeTaps", () => {
  it("hands a tap on the pinned nav that fell through to the page to the nav's control", () => {
    const { tab, row } = setUp();
    setActiveTransition({});
    const onTab = vi.fn((event: Event) => event.preventDefault());
    const onRow = vi.fn((event: Event) => event.preventDefault());
    tab.addEventListener("click", onTab);
    row.addEventListener("click", onRow);
    uninstall = installPinnedChromeTaps(document);

    // During a view transition the browser skips named elements when hit testing, so a
    // tap on the tab reaches the row underneath.
    const event = tap(row, 128, 738);

    expect(event.defaultPrevented).toBe(true);
    expect(onRow).not.toHaveBeenCalled();
    expect(onTab).toHaveBeenCalledTimes(1);
  });

  it("swallows a fall-through tap on the chrome that hits none of its controls", () => {
    const { row } = setUp();
    setActiveTransition({});
    const onRow = vi.fn((event: Event) => event.preventDefault());
    row.addEventListener("click", onRow);
    uninstall = installPinnedChromeTaps(document);

    tap(row, 20, 760);

    expect(onRow).not.toHaveBeenCalled();
  });

  it("leaves ordinary taps alone: on the chrome itself, outside it, and keyboard clicks", () => {
    const { tab, row } = setUp();
    const onTab = vi.fn((event: Event) => event.preventDefault());
    const onRow = vi.fn((event: Event) => event.preventDefault());
    tab.addEventListener("click", onTab);
    row.addEventListener("click", onRow);
    uninstall = installPinnedChromeTaps(document);

    tap(tab, 128, 738);
    tap(row, 200, 660);
    // Enter on a focused link: a click with `detail: 0` and no meaningful coordinates.
    row.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 }),
    );

    expect(onTab).toHaveBeenCalledTimes(1);
    expect(onRow).toHaveBeenCalledTimes(2);
  });

  it("stops intervening once uninstalled", () => {
    const { tab, row } = setUp();
    setActiveTransition({});
    const onTab = vi.fn((event: Event) => event.preventDefault());
    tab.addEventListener("click", onTab);
    row.addEventListener("click", (event) => event.preventDefault());
    installPinnedChromeTaps(document)();

    tap(row, 128, 738);

    expect(onTab).not.toHaveBeenCalled();
  });

  it("never intervenes when no transition runs, or when the browser cannot tell", () => {
    // Safari and Firefox lack document.activeViewTransition: guessing "a transition runs"
    // would steal taps from anything legitimately drawn over the chrome (a toast, a sheet).
    for (const state of [null, "unsupported"] as const) {
      const { tab, row } = setUp();
      setActiveTransition(state);
      const onTab = vi.fn((event: Event) => event.preventDefault());
      const onRow = vi.fn((event: Event) => event.preventDefault());
      tab.addEventListener("click", onTab);
      row.addEventListener("click", onRow);
      uninstall = installPinnedChromeTaps(document);

      tap(row, 128, 738);

      expect(onRow).toHaveBeenCalledTimes(1);
      expect(onTab).not.toHaveBeenCalled();
      uninstall();
    }
  });
});
