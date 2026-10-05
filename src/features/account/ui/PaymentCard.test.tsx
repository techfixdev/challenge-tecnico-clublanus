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
    expect(screen.getByText("978.85")).toBeInTheDocument();
    expect(screen.getByText("**** **** **** 1234")).toBeInTheDocument();
    expect(screen.getByText("Soy Granate")).toBeInTheDocument();
    expect(screen.getByText("Exp. Date")).toBeInTheDocument();
    expect(screen.getByText("02/30")).toBeInTheDocument();
  });

  it("uses a different tone for Visa cards", () => {
    const { container } = render(
      <PaymentCard card={makeCard({ brand: "VISA", last4: "5678" })} />,
    );

    expect(
      screen.getByRole("region", { name: "Tarjeta Visa terminada en 5678" }),
    ).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("data-brand", "VISA");
  });
});
