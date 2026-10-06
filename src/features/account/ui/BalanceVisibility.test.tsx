import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BALANCE_HIDDEN_COOKIE } from "../domain/balance-visibility";
import { BalanceAmount } from "./BalanceAmount";
import { BalanceToggle, BalanceVisibilityProvider } from "./BalanceVisibility";

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

function clearPreferenceCookie() {
  document.cookie = `${BALANCE_HIDDEN_COOKIE}=; Path=/; Max-Age=0`;
}

function renderCard({ initialHidden = false } = {}) {
  return render(
    <BalanceVisibilityProvider initialHidden={initialHidden}>
      <BalanceToggle />
      <BalanceAmount balance="978.85" />
      <BalanceAmount balance="250.00" />
    </BalanceVisibilityProvider>,
  );
}

beforeEach(() => {
  // These tests are about masking, not motion: without the count-up the visible amount
  // is final from the first render, so assertions on it do not depend on frame timing.
  // The count-up itself is covered by BalanceAmount.test.tsx.
  stubReducedMotion(true);
  clearPreferenceCookie();
});

afterEach(() => {
  // Restored here, not at the end of a test, so a failing assertion cannot leak a spy.
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  clearPreferenceCookie();
});

describe("hide / show balance", () => {
  it("is a toggle button with a stable name and its state in aria-pressed", async () => {
    const user = userEvent.setup();
    renderCard();
    const toggle = screen.getByRole("button", { name: "Ocultar saldo" });

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveAccessibleName("Ocultar saldo");
  });

  it("masks every balance and tells screen readers it is hidden", async () => {
    const user = userEvent.setup();
    const { container } = renderCard();

    await user.click(screen.getByRole("button", { name: "Ocultar saldo" }));

    expect(screen.getAllByText("••••••")).toHaveLength(2);
    expect(screen.getAllByText("Saldo oculto")).toHaveLength(2);
    expect(container).not.toHaveTextContent("978.85");
    expect(container).not.toHaveTextContent("250");

    await user.click(screen.getByRole("button", { name: "Ocultar saldo" }));
    expect(screen.queryByText("••••••")).not.toBeInTheDocument();
    // Both the visible amount and the screen-reader text show the real balance again.
    expect(screen.getAllByText("978.85")).toHaveLength(2);
  });

  it("remembers the choice in a cookie the server reads on the next visit", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Ocultar saldo" }));
    expect(document.cookie).toContain(`${BALANCE_HIDDEN_COOKIE}=1`);

    await user.click(screen.getByRole("button", { name: "Ocultar saldo" }));
    expect(document.cookie).toContain(`${BALANCE_HIDDEN_COOKIE}=0`);
  });

  it("starts hidden when the server says the user chose so", () => {
    renderCard({ initialHidden: true });

    expect(
      screen.getByRole("button", { name: "Ocultar saldo" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("••••••")).toHaveLength(2);
  });

  it("still toggles when cookies cannot be written", async () => {
    const user = userEvent.setup();
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    renderCard();

    await user.click(screen.getByRole("button", { name: "Ocultar saldo" }));

    expect(screen.getAllByText("••••••")).toHaveLength(2);
  });
});
