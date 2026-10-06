import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/test/reduced-motion";

import { CardDeck } from "./CardDeck";

const slides = [
  { id: "a", content: <p>Mastercard</p> },
  { id: "b", content: <p>Visa</p> },
];

beforeEach(() => {
  stubReducedMotion(false);
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CardDeck", () => {
  it("lists the cards under an accessible name", () => {
    render(<CardDeck label="Tus tarjetas" slides={slides} />);

    const list = screen.getByRole("list", { name: "Tus tarjetas" });
    expect(list.querySelectorAll("li")).toHaveLength(2);
  });

  it("offers one dot button per card, named by position, marking the current one", () => {
    render(<CardDeck label="Tus tarjetas" slides={slides} />);

    const first = screen.getByRole("button", { name: "Tarjeta 1 de 2" });
    const second = screen.getByRole("button", { name: "Tarjeta 2 de 2" });
    expect(first).toHaveAttribute("aria-current", "true");
    expect(second).not.toHaveAttribute("aria-current");
  });

  it("scrolls to the card when its dot is pressed, smoothly", async () => {
    render(<CardDeck label="Tus tarjetas" slides={slides} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Tarjeta 2 de 2" }),
    );

    expect(Element.prototype.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" }),
    );
  });

  it("jumps instead of gliding under prefers-reduced-motion", async () => {
    stubReducedMotion(true);
    render(<CardDeck label="Tus tarjetas" slides={slides} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Tarjeta 2 de 2" }),
    );

    expect(Element.prototype.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "instant" }),
    );
  });

  it("shows no dots for a single card", () => {
    render(<CardDeck label="Tus tarjetas" slides={slides.slice(0, 1)} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
