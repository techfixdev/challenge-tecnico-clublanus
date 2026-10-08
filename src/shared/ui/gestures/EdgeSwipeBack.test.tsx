import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EdgeSwipeBack } from "./EdgeSwipeBack";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const MOUSE = { pointerId: 1, isPrimary: true, button: 0 };

/** A drag from the left edge to `toX`, lifted there. */
function swipe(toX: number) {
  const target = screen.getByText("Detalle");
  fireEvent.pointerDown(target, { ...MOUSE, clientX: 4, clientY: 100 });
  fireEvent.pointerMove(target, { ...MOUSE, clientX: toX, clientY: 100 });
  fireEvent.pointerUp(target, { ...MOUSE, clientX: toX, clientY: 100 });
}

function swipedScreen() {
  return screen.getByTestId("edge-swipe-screen");
}

describe("EdgeSwipeBack", () => {
  beforeEach(() => {
    push.mockClear();
    Element.prototype.setPointerCapture = vi.fn();
    // Reduced motion: nothing travels on its own, so every position below is the finger's.
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });
  afterEach(() => {
    // @ts-expect-error -- removing the stubs put in place above.
    delete Element.prototype.setPointerCapture;
    // @ts-expect-error -- jsdom has no matchMedia of its own.
    delete window.matchMedia;
  });

  it("goes back when a swipe from the edge is released", () => {
    render(
      <EdgeSwipeBack back={{ href: "/movimientos" }}>
        <p>Detalle</p>
      </EdgeSwipeBack>,
    );

    swipe(200);

    expect(push).toHaveBeenCalledWith("/movimientos", expect.anything());
  });

  it("is back at rest, and swipeable, when the browser shows the page again from its back/forward cache", () => {
    render(
      <EdgeSwipeBack back={{ href: "/movimientos" }}>
        <p>Detalle</p>
      </EdgeSwipeBack>,
    );
    swipe(200);
    // Left mid-way: the page was frozen with the screen pushed aside.
    expect(swipedScreen().style.transform).not.toBe("");

    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    );

    expect(swipedScreen().style.transform).toBe("");
    expect(screen.getByTestId("edge-swipe-shade").style.opacity).toBe("0.08");
    swipe(120);
    expect(push).toHaveBeenCalledTimes(2);
  });
});
