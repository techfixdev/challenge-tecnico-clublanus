import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeCard } from "@/test/movement-fixtures";

import { cardPhrase, toCardFace, type Card } from "../domain/card";
import { CardRevealProvider } from "./CardReveal";
import { PaymentCardArt, PaymentCard as PaymentCardFront } from "./PaymentCard";

/** The front as Home renders it: from the card's face, inside its reveal provider. */
function PaymentCard({ card }: { card: Card }) {
  return (
    <CardRevealProvider cardId={card.id} phrase={cardPhrase(card)}>
      <PaymentCardFront card={toCardFace(card)} />
    </CardRevealProvider>
  );
}

describe("PaymentCard", () => {
  it("is a region named after the card, readable by screen readers", () => {
    render(<PaymentCard card={makeCard()} />);

    expect(
      screen.getByRole("region", {
        name: "Tarjeta Mastercard terminada en 1234",
      }),
    ).toBeInTheDocument();
  });

  it("shows the masked balance, currency, masked number, holder and expiry from the design", () => {
    const { container } = render(<PaymentCard card={makeCard()} />);

    expect(screen.getByText("Saldo")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
    // Hidden by default; the balance is not even in the props (it comes with a reveal).
    expect(screen.getByText("Saldo oculto")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("978");
    expect(screen.getByTestId("card-number")).toHaveTextContent(
      "•••• •••• •••• 1234",
    );
    expect(screen.getByText("Soy Granate")).toBeInTheDocument();
    expect(screen.getByText("Vence")).toBeInTheDocument();
    expect(screen.getByText("02/30")).toBeInTheDocument();
  });

  it("shows a peso card's currency on its chip", () => {
    render(
      <PaymentCard
        card={makeCard({
          brand: "VISA",
          balance: "312400.50",
          currency: "ARS",
        })}
      />,
    );

    expect(screen.getByText("ARS")).toHaveAttribute("aria-hidden", "true");
  });

  it("lays the card number out as four groups, the masked ones apart from the digits", () => {
    render(<PaymentCard card={makeCard({ brand: "VISA", last4: "5678" })} />);

    const number = screen.getByTestId("card-number");
    // Decorative: the region name already says "terminada en 5678".
    expect(number).toHaveAttribute("aria-hidden", "true");
    const groups = Array.from(number.children);
    expect(groups.map((group) => group.textContent)).toEqual([
      "••••",
      "••••",
      "••••",
      "5678",
    ]);
    expect(groups.map((group) => group.hasAttribute("data-masked"))).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it("draws the Visa wordmark on the card's art as a path, not as live text in a box", () => {
    const { container } = render(
      <PaymentCardArt
        card={toCardFace(makeCard({ brand: "VISA", last4: "5678" }))}
      />,
    );

    const logo = container.querySelector("svg[data-brand-logo=VISA]");
    expect(logo).not.toBeNull();
    expect(logo!.querySelector("path")).not.toBeNull();
    expect(logo!.querySelector("text, rect")).toBeNull();
  });

  it("keeps its text on a transparent box: the surface and brand mark are the art's", () => {
    const { container } = render(<PaymentCard card={makeCard()} />);
    const region = screen.getByRole("region", {
      name: "Tarjeta Mastercard terminada en 1234",
    });

    expect(region.className).not.toMatch(/\bbg-/);
    expect(container.querySelector("[data-brand-logo]")).toBeNull();
  });

  it("uses a different tone for Visa cards", () => {
    render(<PaymentCard card={makeCard({ brand: "VISA", last4: "5678" })} />);

    expect(
      screen.getByRole("region", { name: "Tarjeta Visa terminada en 5678" }),
    ).toHaveAttribute("data-brand", "VISA");
  });

  it("has its own eye on every card, primary or not, hidden by default", () => {
    render(
      <>
        <PaymentCard card={makeCard()} />
        <PaymentCard
          card={makeCard({
            id: "card_visa",
            brand: "VISA",
            last4: "5678",
            isPrimary: false,
          })}
        />
      </>,
    );

    for (const name of [
      "Mostrar datos de la tarjeta Mastercard terminada en 1234",
      "Mostrar datos de la tarjeta Visa terminada en 5678",
    ]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
  });
});
