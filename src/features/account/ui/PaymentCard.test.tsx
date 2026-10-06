import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeCard } from "@/test/movement-fixtures";

import { PaymentCard } from "./PaymentCard";

describe("PaymentCard", () => {
  it("is a region named after the card, readable by screen readers", () => {
    render(<PaymentCard card={makeCard()} />);

    expect(
      screen.getByRole("region", {
        name: "Tarjeta Mastercard terminada en 1234",
      }),
    ).toBeInTheDocument();
  });

  it("shows the balance, currency, masked number, holder and expiry from the design", () => {
    render(<PaymentCard card={makeCard()} />);

    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("978,85 dólares")).toBeInTheDocument();
    expect(screen.getByTestId("card-number")).toHaveTextContent(
      "**** **** **** 1234",
    );
    expect(screen.getByText("Soy Granate")).toBeInTheDocument();
    expect(screen.getByText("Exp. Date")).toBeInTheDocument();
    expect(screen.getByText("02/30")).toBeInTheDocument();
  });

  it("shows a peso card's currency on its chip and says the balance in pesos", () => {
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
    expect(screen.getByText("312.400,50 pesos")).toHaveClass("sr-only");
  });

  it("lays the card number out as four groups, the masked ones apart from the digits", () => {
    render(<PaymentCard card={makeCard({ brand: "VISA", last4: "5678" })} />);

    const number = screen.getByTestId("card-number");
    // Decorative: the region name already says "terminada en 5678".
    expect(number).toHaveAttribute("aria-hidden", "true");
    const groups = Array.from(number.children);
    expect(groups.map((group) => group.textContent)).toEqual([
      "****",
      "****",
      "****",
      "5678",
    ]);
    expect(groups.map((group) => group.hasAttribute("data-masked"))).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it("draws the Visa wordmark as a path, not as live text in a box", () => {
    const { container } = render(
      <PaymentCard card={makeCard({ brand: "VISA", last4: "5678" })} />,
    );

    const logo = container.querySelector("svg[data-brand-logo=VISA]");
    expect(logo).not.toBeNull();
    expect(logo!.querySelector("path")).not.toBeNull();
    expect(logo!.querySelector("text, rect")).toBeNull();
  });

  it("uses a different tone for Visa cards", () => {
    render(<PaymentCard card={makeCard({ brand: "VISA", last4: "5678" })} />);

    expect(
      screen.getByRole("region", { name: "Tarjeta Visa terminada en 5678" }),
    ).toHaveAttribute("data-brand", "VISA");
  });

  it("shows the hide-balance toggle on the primary card only", () => {
    const { rerender } = render(<PaymentCard card={makeCard()} />);
    expect(
      screen.getByRole("button", { name: "Ocultar saldo" }),
    ).toBeInTheDocument();

    rerender(
      <PaymentCard card={makeCard({ brand: "VISA", isPrimary: false })} />,
    );
    expect(
      screen.queryByRole("button", { name: "Ocultar saldo" }),
    ).not.toBeInTheDocument();
  });
});
