import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BalanceAmount } from "./BalanceAmount";
import { COUNT_UP_MS } from "./count-up";

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/** Visible (animated) digits: hidden from screen readers. */
function visibleAmount(container: HTMLElement) {
  return container.querySelector(
    '[data-testid="balance-amount"] [aria-hidden="true"]',
  )?.textContent;
}

beforeEach(() => {
  stubReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("BalanceAmount count-up", () => {
  it("counts up from 0 to the exact balance when it mounts on the client", () => {
    vi.useFakeTimers({
      toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"],
    });
    const { container } = render(<BalanceAmount balance="978.85" />);

    expect(visibleAmount(container)).toBe("0.00");
    act(() => {
      vi.advanceTimersByTime(COUNT_UP_MS / 2);
    });
    expect(Number(visibleAmount(container))).toBeGreaterThan(0);
    act(() => {
      vi.advanceTimersByTime(COUNT_UP_MS);
    });
    expect(visibleAmount(container)).toBe("978.85");
  });

  it("gives screen readers only the final value", () => {
    const { container } = render(<BalanceAmount balance="978.85" />);

    expect(visibleAmount(container)).toBe("0.00");
    expect(screen.getByText("978.85")).toHaveClass("sr-only");
  });

  it("shows the final value at once under prefers-reduced-motion", () => {
    stubReducedMotion(true);
    const { container } = render(<BalanceAmount balance="978.85" />);

    expect(visibleAmount(container)).toBe("978.85");
  });

  it("does not replay over a server-rendered balance while hydrating (no 978.85 → 0 flash)", async () => {
    const host = document.createElement("div");
    host.innerHTML = renderToString(<BalanceAmount balance="978.85" />);
    document.body.append(host);

    await act(async () => {
      hydrateRoot(host, <BalanceAmount balance="978.85" />);
    });

    expect(visibleAmount(host)).toBe("978.85");
    host.remove();
  });
});
