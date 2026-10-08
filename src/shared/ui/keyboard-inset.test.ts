import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { keyboardInset, useKeyboardInset } from "./keyboard-inset";

describe("keyboardInset", () => {
  it("is the part of the layout viewport the on-screen keyboard covers", () => {
    // 844px tall layout viewport, 508px visible above a 336px keyboard.
    expect(
      keyboardInset({ layoutHeight: 844, height: 508, offsetTop: 0, scale: 1 }),
    ).toBe(336);
    // iOS scrolls the visual viewport down inside the layout one when focusing a field.
    expect(
      keyboardInset({
        layoutHeight: 844,
        height: 508,
        offsetTop: 120,
        scale: 1,
      }),
    ).toBe(216);
  });

  it("is zero without a keyboard, for sub-pixel noise, and while pinch-zoomed", () => {
    expect(
      keyboardInset({ layoutHeight: 844, height: 844, offsetTop: 0, scale: 1 }),
    ).toBe(0);
    expect(
      keyboardInset({
        layoutHeight: 844,
        height: 843.6,
        offsetTop: 0,
        scale: 1,
      }),
    ).toBe(0);
    // Zoomed in, the visual viewport is smaller for another reason: nothing to avoid.
    expect(
      keyboardInset({ layoutHeight: 844, height: 422, offsetTop: 0, scale: 2 }),
    ).toBe(0);
  });
});

describe("useKeyboardInset", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows the visual viewport, and is zero where the browser has none", () => {
    const listeners = new Map<string, () => void>();
    const viewport = {
      height: 844,
      offsetTop: 0,
      scale: 1,
      addEventListener: (type: string, listener: () => void) =>
        listeners.set(type, listener),
      removeEventListener: (type: string) => listeners.delete(type),
    };
    vi.stubGlobal("visualViewport", viewport);
    vi.stubGlobal("innerHeight", 844);

    const { result, unmount } = renderHook(() => useKeyboardInset());
    expect(result.current).toBe(0);

    viewport.height = 508;
    act(() => listeners.get("resize")?.());
    expect(result.current).toBe(336);

    unmount();
    expect(listeners.size).toBe(0);

    vi.stubGlobal("visualViewport", undefined);
    expect(renderHook(() => useKeyboardInset()).result.current).toBe(0);
  });
});
