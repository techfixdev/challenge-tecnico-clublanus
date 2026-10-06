import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/test/reduced-motion";

import { BalanceAmount } from "./BalanceAmount";

/** The 0–9 strips of the odometer, in reading order. */
function strips(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      "[data-testid=balance-amount] [data-digit]",
    ),
  );
}

/** Each strip's resting offset, e.g. "-90%" for a 9. */
function offsets(container: HTMLElement) {
  return strips(container).map(
    (strip) => strip.style.transform.match(/translateY\((.*)\)/)?.[1] ?? "0%",
  );
}

const FINAL_978_85 = ["-90%", "-70%", "-80%", "-80%", "-50%"];

beforeEach(() => {
  stubReducedMotion(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BalanceAmount odometer", () => {
  it("has one rolling column per digit, aiming at the balance's digits", () => {
    const { container } = render(<BalanceAmount balance="978.85" />);

    expect(strips(container).map((strip) => strip.dataset.digit)).toEqual([
      "9",
      "7",
      "8",
      "8",
      "5",
    ]);
  });

  it("sizes each column by its own final digit, so a narrow 1 keeps natural spacing", () => {
    // Poppins has no tabular figures: a column as wide as the widest digit would leave
    // a gap around every 1 ("31 2.40"). An invisible copy of the final digit sizes it.
    const { container } = render(<BalanceAmount balance="111.11" />);

    const sizers = Array.from(
      container.querySelectorAll<HTMLElement>(
        "[data-odometer] [data-digit-sizer]",
      ),
    );
    expect(sizers.map((sizer) => sizer.textContent)).toEqual([
      "1",
      "1",
      "1",
      "1",
      "1",
    ]);
    for (const sizer of sizers) expect(sizer).toHaveClass("invisible");
  });

  it("starts rolling from 0 when it mounts on the client", () => {
    const { container } = render(<BalanceAmount balance="978.85" />);

    expect(offsets(container)).toEqual(["0%", "0%", "0%", "0%", "0%"]);
  });

  it("gives screen readers only the final value, never the digit strips", () => {
    const { container } = render(<BalanceAmount balance="978.85" />);

    expect(screen.getByText("978.85")).toHaveClass("sr-only");
    for (const strip of strips(container))
      expect(strip.closest("[aria-hidden=true]")).not.toBeNull();
  });

  it("shows the final digits at once under prefers-reduced-motion", () => {
    stubReducedMotion(true);
    const { container } = render(<BalanceAmount balance="978.85" />);

    expect(offsets(container)).toEqual(FINAL_978_85);
  });

  it("does not replay over a server-rendered balance while hydrating (no 978.85 → 0 flash)", async () => {
    const host = document.createElement("div");
    host.innerHTML = renderToString(<BalanceAmount balance="978.85" />);
    document.body.append(host);
    // The server HTML already has every strip in its final place.
    expect(offsets(host)).toEqual(FINAL_978_85);

    await act(async () => {
      hydrateRoot(host, <BalanceAmount balance="978.85" />);
    });

    expect(offsets(host)).toEqual(FINAL_978_85);
    host.remove();
  });
});
