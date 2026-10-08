import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeMovement } from "@/test/movement-fixtures";

import { MovementDetail } from "./MovementDetail";

describe("MovementDetail", () => {
  it("shows the receipt data with a signed amount, garnet when money comes in", () => {
    render(
      <MovementDetail
        movement={makeMovement({
          counterparty: "Ronaldo",
          description: "Pago recibido",
          type: "RECEIVED",
          amount: "95.00",
          reference: "GB-000002",
          occurredAt: new Date("2026-10-04T21:00:00Z"),
        })}
        backHref="/movimientos?type=recibido"
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Ronaldo" }),
    ).toBeInTheDocument();
    expect(screen.getByText("+US$ 95").parentElement).toHaveClass(
      "text-received",
    );
    expect(screen.getByText("más 95 dólares")).toHaveClass("sr-only");
    expect(screen.getByText("4 de octubre de 2026")).toBeInTheDocument();
    expect(screen.getByText("18:00 h")).toBeInTheDocument();
    expect(screen.getByText("GB-000002")).toBeInTheDocument();
    expect(screen.getByText("Recibido")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver" })).toHaveAttribute(
      "href",
      "/movimientos?type=recibido",
    );
  });

  it("uses a minus sign and calm ink for money leaving the account, and names the card", () => {
    render(
      <MovementDetail
        movement={makeMovement({
          type: "SENT",
          amount: "35.50",
          status: "PENDING",
        })}
        backHref="/movimientos"
      />,
    );

    expect(screen.getByText("−US$ 35,50").parentElement).toHaveClass(
      "text-foreground",
    );
    expect(screen.getByText("menos 35,50 dólares")).toHaveClass("sr-only");
    // One status, the badge under the amount: no second "Estado" row repeating it.
    expect(screen.getAllByText("Pendiente")).toHaveLength(1);
    expect(screen.queryByText("Estado")).not.toBeInTheDocument();
    expect(screen.getByText(/Mastercard/)).toHaveTextContent(
      "Mastercard •••• terminada en 1234",
    );
  });

  it("sits under a navigation bar titled Movimiento, with a bare back chevron", () => {
    render(
      <MovementDetail movement={makeMovement()} backHref="/movimientos" />,
    );

    expect(screen.getByTestId("nav-bar-title")).toHaveTextContent("Movimiento");
    expect(screen.getByRole("link", { name: "Volver" })).toHaveTextContent("");
  });

  it("offers to share the receipt and copy its reference", () => {
    render(
      <MovementDetail
        movement={makeMovement({ reference: "GB-000042" })}
        backHref="/movimientos"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Compartir comprobante" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copiar referencia" }),
    ).toBeInTheDocument();
  });

  it("repeats a transfer the user sent to a known recipient", () => {
    render(
      <MovementDetail
        movement={makeMovement({
          type: "SENT",
          recipientAlias: "hincha.granate",
        })}
        backHref="/movimientos"
      />,
    );

    expect(
      screen.getByRole("link", { name: "Repetir transferencia" }),
    ).toHaveAttribute("href", "/transferir?to=hincha.granate");
  });

  it.each([
    ["money received", { type: "RECEIVED", recipientAlias: "ronaldo.10" }],
    ["a subscription", { type: "SUBSCRIPTION" }],
    ["a sent movement with no known recipient", { type: "SENT" }],
  ] as const)("does not offer a repeat for %s", (_label, overrides) => {
    render(
      <MovementDetail
        movement={makeMovement(overrides)}
        backHref="/movimientos"
      />,
    );

    expect(
      screen.queryByRole("link", { name: "Repetir transferencia" }),
    ).not.toBeInTheDocument();
  });

  it("dates movements in Buenos Aires time, whatever the server's time zone", () => {
    // Vitest runs with TZ=UTC (like Vercel): 01:30 UTC on Oct 5 is still Oct 4 in Argentina.
    render(
      <MovementDetail
        movement={makeMovement({
          occurredAt: new Date("2026-10-05T01:30:00Z"),
        })}
        backHref="/movimientos"
      />,
    );

    expect(screen.getByText("4 de octubre de 2026")).toBeInTheDocument();
    expect(screen.getByText("22:30 h")).toBeInTheDocument();
  });
});
