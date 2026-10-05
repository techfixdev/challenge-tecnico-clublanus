import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FEEDBACK_MS, NotificationsButton } from "./NotificationsButton";

afterEach(() => {
  vi.useRealTimers();
});

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("NotificationsButton", () => {
  it("is an accessible button that announces the feature is coming soon", async () => {
    const user = userEvent.setup();
    render(<NotificationsButton />);

    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    await user.click(screen.getByRole("button", { name: "Notificaciones" }));

    expect(status).toHaveTextContent("Próximamente");
  });

  it("hides the message after a moment, and each click restarts that moment", () => {
    vi.useFakeTimers();
    render(<NotificationsButton />);
    const button = screen.getByRole("button", { name: "Notificaciones" });

    fireEvent.click(button);
    advance(FEEDBACK_MS - 500);
    fireEvent.click(button);
    advance(FEEDBACK_MS - 500);

    expect(screen.getByRole("status")).toHaveTextContent("Próximamente");

    advance(500);

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("clears its timer on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = render(<NotificationsButton />);

    fireEvent.click(screen.getByRole("button", { name: "Notificaciones" }));
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
