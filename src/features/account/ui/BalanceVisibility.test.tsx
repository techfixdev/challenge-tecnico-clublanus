import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/test/reduced-motion";

import { BALANCE_HIDDEN_COOKIE } from "../domain/balance-visibility";
import { BalanceAmount } from "./BalanceAmount";
import { BalanceToggle, BalanceVisibilityProvider } from "./BalanceVisibility";

/** What each amount shows: its mask, or its digits ("shown" layer of the morph). */
function visibleLayers(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll('[data-testid="balance-amount"]'),
    (amount) =>
      amount.querySelector('[data-balance-mask][data-state="shown"]')
        ?.textContent ??
      (amount.querySelector('[data-odometer][data-state="shown"]')
        ? "digits"
        : "nothing"),
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
  // These tests are about masking, not motion: without the odometer roll the digits are
  // final from the first render, so assertions do not depend on frame timing.
  // The roll itself is covered by BalanceAmount.test.tsx.
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

    expect(visibleLayers(container)).toEqual(["••••••", "••••••"]);
    expect(screen.getAllByText("Saldo oculto")).toHaveLength(2);
    expect(container).not.toHaveTextContent("978.85");
    expect(container).not.toHaveTextContent("250");
    // The digit strips roll back to 0, so the hidden markup does not spell the balance.
    expect(
      Array.from(container.querySelectorAll("[data-digit]"), (strip) =>
        strip.getAttribute("data-digit"),
      ),
    ).toEqual(Array(8).fill("0"));

    await user.click(screen.getByRole("button", { name: "Ocultar saldo" }));
    // The mask stays mounted (faded out) so it can morph; the digits are the shown layer.
    expect(visibleLayers(container)).toEqual(["digits", "digits"]);
    expect(screen.getByText("978.85")).toHaveClass("sr-only");
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
    const { container } = renderCard({ initialHidden: true });

    expect(
      screen.getByRole("button", { name: "Ocultar saldo" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(visibleLayers(container)).toEqual(["••••••", "••••••"]);
  });

  it("still toggles when cookies cannot be written", async () => {
    const user = userEvent.setup();
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    const { container } = renderCard();

    await user.click(screen.getByRole("button", { name: "Ocultar saldo" }));

    expect(visibleLayers(container)).toEqual(["••••••", "••••••"]);
  });
});
