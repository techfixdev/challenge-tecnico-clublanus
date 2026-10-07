import { act, fireEvent, render, screen } from "@testing-library/react";
import { motionValue } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/test/reduced-motion";

import { DeckDraggingContext } from "./card-deck-drag";
import { LivingCard } from "./LivingCard";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LivingCard", () => {
  it("renders its card without any light sweep on mount", () => {
    stubReducedMotion(false);
    render(
      <LivingCard tone="primary">
        <p>Tarjeta</p>
      </LivingCard>,
    );

    expect(screen.getByText("Tarjeta")).toBeInTheDocument();
    // The 1.2s sweep across the first card was decoration that delayed nothing useful.
    expect(screen.queryByTestId("card-sweep")).not.toBeInTheDocument();
  });

  it("stays flat under prefers-reduced-motion", () => {
    stubReducedMotion(true);
    render(
      <LivingCard tone="primary">
        <p>Tarjeta</p>
      </LivingCard>,
    );
    const card = screen.getByTestId("living-card");
    card.getBoundingClientRect = () => new DOMRect(0, 0, 300, 180);

    fireEvent.pointerDown(card, { clientX: 290, clientY: 10 });
    fireEvent.pointerMove(card, { clientX: 295, clientY: 5 });

    expect(screen.getByTestId("living-card-surface").style.transform).toBe(
      "none",
    );
  });

  describe("flip", () => {
    function renderFlippable() {
      return render(
        <LivingCard
          tone="primary"
          flipLabel="Ver reverso de la tarjeta Visa terminada en 5678"
          back={<p>Reverso</p>}
        >
          <p>Frente</p>
        </LivingCard>,
      );
    }
    const flipButton = () =>
      screen.getByRole("button", {
        name: "Ver reverso de la tarjeta Visa terminada en 5678",
      });
    const face = (name: "front" | "back") =>
      document.querySelector<HTMLElement>(`[data-face=${name}]`)!;

    it("is a toggle button that shows the back on a tap, and the front again on the next", () => {
      stubReducedMotion(false);
      renderFlippable();
      expect(flipButton()).toHaveAttribute("aria-pressed", "false");
      expect(face("back")).toHaveAttribute("inert");
      expect(face("back")).toHaveAttribute("aria-hidden", "true");

      fireEvent.pointerDown(flipButton(), { clientX: 100, clientY: 50 });
      fireEvent.click(flipButton(), { clientX: 102, clientY: 51, detail: 1 });

      expect(flipButton()).toHaveAttribute("aria-pressed", "true");
      expect(face("front")).toHaveAttribute("inert");
      expect(face("back")).not.toHaveAttribute("inert");
      expect(screen.getByText("Reverso de la tarjeta")).toHaveAttribute(
        "aria-live",
        "polite",
      );

      fireEvent.click(flipButton(), { detail: 0 });
      expect(flipButton()).toHaveAttribute("aria-pressed", "false");
    });

    it("flips from the keyboard (a click with detail 0)", () => {
      stubReducedMotion(false);
      renderFlippable();

      fireEvent.click(flipButton(), { detail: 0 });

      expect(flipButton()).toHaveAttribute("aria-pressed", "true");
    });

    it("does not flip after a drag (swipe or tilt): the press moved", () => {
      stubReducedMotion(false);
      renderFlippable();

      fireEvent.pointerDown(flipButton(), { clientX: 200, clientY: 50 });
      fireEvent.click(flipButton(), { clientX: 120, clientY: 52, detail: 1 });

      expect(flipButton()).toHaveAttribute("aria-pressed", "false");
    });

    it("does not flip when the browser cancelled the press to scroll", () => {
      stubReducedMotion(false);
      renderFlippable();

      fireEvent.pointerDown(flipButton(), { clientX: 200, clientY: 50 });
      fireEvent.pointerCancel(flipButton());
      fireEvent.click(flipButton(), { clientX: 200, clientY: 50, detail: 1 });

      expect(flipButton()).toHaveAttribute("aria-pressed", "false");
    });

    it("does not flip once the carousel took the press over as a sideways drag", () => {
      stubReducedMotion(false);
      const dragging = motionValue(false);
      render(
        <DeckDraggingContext.Provider value={dragging}>
          <LivingCard
            tone="primary"
            flipLabel="Ver reverso de la tarjeta Visa terminada en 5678"
            back={<p>Reverso</p>}
          >
            <p>Frente</p>
          </LivingCard>
        </DeckDraggingContext.Provider>,
      );

      // The deck moves with the finger, so the card's own geometry barely changes.
      fireEvent.pointerDown(flipButton(), { clientX: 200, clientY: 50 });
      act(() => dragging.set(true));
      act(() => dragging.set(false));
      fireEvent.click(flipButton(), { clientX: 202, clientY: 50, detail: 1 });

      expect(flipButton()).toHaveAttribute("aria-pressed", "false");
    });

    it("crossfades without rotating under prefers-reduced-motion", () => {
      stubReducedMotion(true);
      renderFlippable();

      fireEvent.click(flipButton(), { detail: 0 });

      expect(flipButton()).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("living-card-surface").style.transform).toBe(
        "none",
      );
      expect(face("back").style.transform).toBe("none");
    });
  });
});
