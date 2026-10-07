import { render, screen } from "@testing-library/react";
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
  it("reveals with a fade and a short rise, never a blur", () => {
    const { container, rerender } = render(
      <BalanceAmount balance={null} currency="USD" />,
    );
    rerender(<BalanceAmount balance="978.85" currency="USD" />);

    const odometer = container.querySelector<HTMLElement>("[data-odometer]")!;
    expect(odometer.style.filter).toBe("");
    expect(odometer.style.opacity).toBe("0");
    expect(odometer.style.transform).toBe("translateY(4px)");
  });

  it("has one rolling column per digit, aiming at the balance's digits", () => {
    const { container } = render(
      <BalanceAmount balance="978.85" currency="USD" />,
    );

    expect(strips(container).map((strip) => strip.dataset.digit)).toEqual([
      "9",
      "7",
      "8",
      "8",
      "5",
    ]);
  });

  it("sizes each column by its own final digit, so a narrow 1 keeps natural spacing", () => {
    // The display face has no tabular figures: a column as wide as the widest digit would
    // leave a gap around every 1 ("31 2.40"). An invisible copy of the final digit sizes it.
    const { container } = render(
      <BalanceAmount balance="111.11" currency="USD" />,
    );

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

  it("renders only the mask while hidden: no digits, no columns, nothing to measure", () => {
    const { container } = render(
      <BalanceAmount balance={null} currency="USD" />,
    );

    expect(container.querySelector("[data-odometer]")).toBeNull();
    expect(container.querySelector("[data-digit-sizer]")).toBeNull();
    expect(
      container.querySelector('[data-balance-mask][data-state="shown"]'),
    ).toHaveTextContent("••••••");
    expect(screen.getByText("Saldo oculto")).toHaveClass("sr-only");
  });

  it("keeps every column at the font's own spacing: no optical correction around a 1", () => {
    const { container } = render(
      <BalanceAmount balance="312.41" currency="USD" />,
    );

    const columns = Array.from(
      container.querySelectorAll<HTMLElement>(
        "[data-odometer] [data-digit-sizer]",
      ),
    ).map((sizer) => sizer.parentElement!);
    // Rokkitt's sidebearings are even on every digit (measured: 0.03–0.04em), unlike
    // Poppins', whose 1 needed its neighbors pulled in.
    expect(columns).toHaveLength(5);
    for (const column of columns)
      expect(column.getAttribute("style")).toBeNull();
  });

  it("gives screen readers only the final value, never the digit strips", () => {
    const { container } = render(
      <BalanceAmount balance="978.85" currency="USD" />,
    );

    expect(screen.getByText("978,85 dólares")).toHaveClass("sr-only");
    for (const strip of strips(container))
      expect(strip.closest("[aria-hidden=true]")).not.toBeNull();
  });

  it("shows the final digits at once under prefers-reduced-motion", () => {
    stubReducedMotion(true);
    const { container } = render(
      <BalanceAmount balance="978.85" currency="USD" />,
    );

    expect(offsets(container)).toEqual(FINAL_978_85);
  });

  it("server-renders the hidden state without any digit of the balance", () => {
    const html = renderToString(
      <BalanceAmount balance={null} currency="USD" />,
    );

    expect(html).toContain('data-state="shown"');
    expect(html).toContain("Saldo oculto");
    expect(html).not.toMatch(/data-digit/);
  });

  it("rolls from 0 when a hidden balance is revealed, and masks it again on hide", () => {
    const { container, rerender } = render(
      <BalanceAmount balance={null} currency="USD" />,
    );

    rerender(<BalanceAmount balance="978.85" currency="USD" />);
    expect(offsets(container)).toEqual(["0%", "0%", "0%", "0%", "0%"]);
    expect(screen.getByText("978,85 dólares")).toHaveClass("sr-only");

    rerender(<BalanceAmount balance={null} currency="USD" />);
    expect(screen.getByText("Saldo oculto")).toBeInTheDocument();
    expect(
      container.querySelector('[data-balance-mask][data-state="shown"]'),
    ).not.toBeNull();
  });
});
