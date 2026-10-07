import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CLOSE_QUICK_ACTION,
  NAV_TAB,
  POP,
  PUSH,
  announceNavigation,
  currentNavigationTypes,
  screenTransition,
  settleNavigation,
} from "./navigation";

afterEach(() => {
  settleNavigation();
  vi.useRealTimers();
});

describe("screenTransition", () => {
  it("maps each navigation type to the screen's classes", () => {
    const { enter, exit } = screenTransition({
      placeholder: false,
      types: () => [],
    });
    expect(enter["nav-forward"]).toBe("nav-push-in");
    expect(exit["nav-forward"]).toBe("nav-push-out");
    expect(enter["nav-back"]).toBe("nav-pop-in");
    expect(exit["nav-back"]).toBe("nav-pop-out");
    expect(enter[NAV_TAB]).toBe("nav-tab-in");
    expect(enter["quick-action-open"]).toBe("none");
    // Untyped: a reveal for the content, nothing for what leaves.
    expect(enter.default).toBe("reveal");
    expect(exit.default).toBe("none");
  });

  it("falls back to the announced navigation when React lost the types", () => {
    // React queues transition types per root: another transition committing between the
    // tap and the navigation takes them. The announced types keep the motion right.
    const push = screenTransition({ placeholder: false, types: () => PUSH });
    expect(push.enter.default).toBe("nav-push-in");
    expect(push.exit.default).toBe("nav-push-out");

    const pop = screenTransition({ placeholder: true, types: () => POP });
    expect(pop.enter.default).toBe("nav-pop-in");
    expect(pop.exit.default).toBe("nav-pop-out");

    // A quick action keeps the screens still, whichever way the types arrive.
    const close = screenTransition({
      placeholder: false,
      types: () => CLOSE_QUICK_ACTION,
    });
    expect(close.enter.default).toBe("none");
  });

  it("lets a skeleton fade out when its content replaces it", () => {
    const { enter, exit } = screenTransition({
      placeholder: true,
      types: () => [],
    });
    expect(enter.default).toBe("none");
    expect(exit.default).toBe("skeleton-out");
  });
});

describe("announced navigation", () => {
  it("is what a screen's untyped default reads when React commits", () => {
    const { enter, exit } = screenTransition({ placeholder: false });
    expect(enter.default).toBe("reveal");

    announceNavigation(POP);

    // The same objects, read later: the leaving screen rendered before the tap.
    expect(enter.default).toBe("nav-pop-in");
    expect(exit.default).toBe("nav-pop-out");
  });

  it("is held until the navigation settles", () => {
    expect(currentNavigationTypes()).toEqual([]);

    announceNavigation(PUSH);
    expect(currentNavigationTypes()).toEqual(PUSH);

    settleNavigation();
    expect(currentNavigationTypes()).toEqual([]);
  });

  it("expires on its own if the navigation never lands", () => {
    vi.useFakeTimers();
    announceNavigation(PUSH);

    vi.advanceTimersByTime(5_000);

    expect(currentNavigationTypes()).toEqual([]);
  });
});
