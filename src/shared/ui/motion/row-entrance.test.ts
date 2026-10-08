import { afterEach, describe, expect, it, vi } from "vitest";

import {
  closeRowEntranceWindow,
  ROW_ENTRANCE_CLOSED,
  resetRowEntranceWindowForTests,
  watchFirstRowEntrance,
} from "./row-entrance";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

function closed() {
  return document.documentElement.hasAttribute(ROW_ENTRANCE_CLOSED);
}

afterEach(() => {
  resetRowEntranceWindowForTests();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "getAnimations");
});

describe("closeRowEntranceWindow", () => {
  it("closes at once when no row is entering (rows inserted later never stagger)", async () => {
    await closeRowEntranceWindow();

    expect(closed()).toBe(true);
  });

  it("lets the first paint's rows finish entering before closing", async () => {
    const entering = deferred();
    Object.assign(document, {
      getAnimations: () => [
        { animationName: "row-enter", finished: entering.promise },
        { animationName: "skeleton-shimmer", finished: new Promise(() => {}) },
      ],
    });

    const closing = closeRowEntranceWindow();
    await Promise.resolve();
    expect(closed()).toBe(false);

    entering.resolve();
    await closing;
    expect(closed()).toBe(true);
  });

  it("closes even when an entrance is cancelled instead of finishing", async () => {
    Object.assign(document, {
      getAnimations: () => [
        { animationName: "row-enter", finished: Promise.reject(new Error()) },
      ],
    });

    await closeRowEntranceWindow();

    expect(closed()).toBe(true);
  });

  it("runs once per page load", async () => {
    const getAnimations = vi.fn(() => []);
    Object.assign(document, { getAnimations });

    await Promise.all([closeRowEntranceWindow(), closeRowEntranceWindow()]);

    expect(getAnimations).toHaveBeenCalledTimes(1);
  });
});

function animationStart(animationName: string) {
  const event = new Event("animationstart", { bubbles: true });
  Object.assign(event, { animationName });
  return event;
}

describe("watchFirstRowEntrance", () => {
  it("waits for the first rows to enter, even when they stream in after hydration", async () => {
    Object.assign(document, { getAnimations: () => [] });
    watchFirstRowEntrance();
    await Promise.resolve();
    // No rows yet (a skeleton): the window stays open for them.
    expect(closed()).toBe(false);

    document.body.dispatchEvent(animationStart("skeleton-shimmer"));
    await Promise.resolve();
    expect(closed()).toBe(false);

    document.body.dispatchEvent(animationStart("row-enter"));
    await vi.waitFor(() => expect(closed()).toBe(true));
  });

  it("closes after the rows already entering when it starts", async () => {
    const entering = deferred();
    Object.assign(document, {
      getAnimations: () => [
        { animationName: "row-enter", finished: entering.promise },
      ],
    });

    watchFirstRowEntrance();
    await Promise.resolve();
    expect(closed()).toBe(false);
    entering.resolve();

    await vi.waitFor(() => expect(closed()).toBe(true));
  });
});
