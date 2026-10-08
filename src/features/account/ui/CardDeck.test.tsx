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

  it("brings a card to the front when its dot is pressed", async () => {
    render(<CardDeck label="Tus tarjetas" slides={slides} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Tarjeta 2 de 2" }),
    );

    expect(
      screen.getByRole("button", { name: "Tarjeta 2 de 2" }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("moves between cards with the arrow keys, Home and End, never past the ends", async () => {
    render(<CardDeck label="Tus tarjetas" slides={slides} />);
    const current = () =>
      screen
        .getAllByRole("button")
        .findIndex((dot) => dot.getAttribute("aria-current") === "true");

    screen.getByRole("list", { name: "Tus tarjetas" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(current()).toBe(1);
    await userEvent.keyboard("{ArrowRight}");
    expect(current()).toBe(1);
    await userEvent.keyboard("{Home}");
    expect(current()).toBe(0);
    await userEvent.keyboard("{ArrowLeft}");
    expect(current()).toBe(0);
    await userEvent.keyboard("{End}");
    expect(current()).toBe(1);
  });

  it("moves the cards under prefers-reduced-motion too", async () => {
    stubReducedMotion(true);
    render(<CardDeck label="Tus tarjetas" slides={slides} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Tarjeta 2 de 2" }),
    );

    expect(
      screen.getByRole("button", { name: "Tarjeta 2 de 2" }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("shows no dots for a single card", () => {
    render(<CardDeck label="Tus tarjetas" slides={slides.slice(0, 1)} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
