import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/test/reduced-motion";

import { LivingCard } from "./LivingCard";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LivingCard", () => {
  it("renders its card and keeps the decorative layers away from screen readers", () => {
    stubReducedMotion(false);
    render(
      <LivingCard tone="primary" sweep>
        <p>Tarjeta</p>
      </LivingCard>,
    );

    expect(screen.getByText("Tarjeta")).toBeInTheDocument();
    expect(screen.getByTestId("card-sweep")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("sweeps light only across the card asked to (the primary one)", () => {
    stubReducedMotion(false);
    render(
      <LivingCard tone="pink">
        <p>Visa</p>
      </LivingCard>,
    );

    expect(screen.queryByTestId("card-sweep")).not.toBeInTheDocument();
  });

  it("stays flat and skips the sweep under prefers-reduced-motion", () => {
    stubReducedMotion(true);
    render(
      <LivingCard tone="primary" sweep>
        <p>Tarjeta</p>
      </LivingCard>,
    );
    const card = screen.getByTestId("living-card");
    card.getBoundingClientRect = () => new DOMRect(0, 0, 300, 180);

    fireEvent.pointerDown(card, { clientX: 290, clientY: 10 });
    fireEvent.pointerMove(card, { clientX: 295, clientY: 5 });

    expect(screen.queryByTestId("card-sweep")).not.toBeInTheDocument();
    expect(screen.getByTestId("living-card-surface").style.transform).toBe(
      "none",
    );
  });
});
