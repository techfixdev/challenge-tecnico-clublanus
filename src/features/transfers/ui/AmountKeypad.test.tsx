import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AmountKeypad } from "./AmountKeypad";

/** Longer than the long press, so a held delete has cleared by then. */
const HOLD_MS = 600;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderKeypad() {
  const onKey = vi.fn();
  const view = render(<AmountKeypad onKey={onKey} />);
  const remove = screen.getByRole("button", { name: "Borrar" });
  return { onKey, remove, ...view };
}

describe("AmountKeypad's delete key", () => {
  it("clears on a long press, and the click that ends it deletes nothing more", () => {
    const { onKey, remove } = renderKeypad();

    fireEvent.pointerDown(remove);
    vi.advanceTimersByTime(HOLD_MS);
    fireEvent.pointerUp(remove);
    fireEvent.click(remove);

    expect(onKey.mock.calls).toEqual([["clear"]]);
  });

  it("does not clear once the keypad is gone, even if the press was still held", () => {
    const { onKey, remove, unmount } = renderKeypad();

    fireEvent.pointerDown(remove);
    // The keypad folds away mid-press (the step changed).
    unmount();
    vi.advanceTimersByTime(HOLD_MS);

    expect(onKey).not.toHaveBeenCalled();
  });

  it("deletes from the keyboard after a long press that ended off the key", async () => {
    const { onKey, remove } = renderKeypad();

    fireEvent.pointerDown(remove);
    vi.advanceTimersByTime(HOLD_MS);
    // The finger slides off before lifting: no click ends this press.
    fireEvent.pointerLeave(remove);

    // The rest is a real keyboard press, on the real clock.
    vi.useRealTimers();
    const user = userEvent.setup();
    remove.focus();
    await user.keyboard("{Enter}");

    expect(onKey.mock.calls).toEqual([["clear"], ["delete"]]);
  });
});
