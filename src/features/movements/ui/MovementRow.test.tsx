import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeMovement } from "@/test/movement-fixtures";

import { MovementRow } from "./MovementRow";

function renderRow(...args: Parameters<typeof makeMovement>) {
  const movement = makeMovement(...args);
  render(
    <MovementRow movement={movement} href={`/movimientos/${movement.id}`} />,
  );
  return { movement, link: screen.getByRole("link") };
}

describe("MovementRow", () => {
  it("links the whole row to the movement detail", () => {
    const { movement, link } = renderRow();

    expect(link).toHaveAttribute("href", `/movimientos/${movement.id}`);
  });

  it("shows counterparty, description and the signed amount", () => {
    renderRow({ counterparty: "Adobe", amount: "125.00" });

    expect(screen.getByText("Adobe")).toBeInTheDocument();
    expect(screen.getByText("Pago de suscripción")).toBeInTheDocument();
    // U+2212 MINUS SIGN, not a hyphen.
    expect(screen.getByText("\u2212US$ 125")).toBeInTheDocument();
  });

  it("writes a peso amount with its own symbol and says its currency", () => {
    const { link } = renderRow({ amount: "11999.00", currency: "ARS" });

    expect(screen.getByText("\u2212$ 11.999")).toBeInTheDocument();
    expect(link).toHaveAccessibleName(
      expect.stringContaining("menos 11.999 pesos"),
    );
  });

  it.each([
    [
      "SUBSCRIPTION",
      "Débito automático",
      "\u2212US$ 95",
      "menos 95 dólares",
      "text-foreground",
      "bg-subscription-soft",
    ],
    [
      "RECEIVED",
      "Recibido",
      "+US$ 95",
      "más 95 dólares",
      "text-received",
      "bg-received-soft",
    ],
    [
      "SENT",
      "Enviado",
      "\u2212US$ 95",
      "menos 95 dólares",
      "text-foreground",
      "bg-sent-soft",
    ],
  ] as const)(
    "signs %s movements by direction, keeps the type on the tile and names it",
    (type, label, text, spoken, amountClass, tileClass) => {
      const { link } = renderRow({ type, amount: "95.00" });

      expect(link).toHaveAccessibleName(expect.stringContaining(label));
      expect(link).toHaveAccessibleName(expect.stringContaining(spoken));
      expect(screen.getByText(text).parentElement).toHaveClass(amountClass);
      expect(screen.getByTestId("movement-icon")).toHaveClass(tileClass);
    },
  );

  it("flags pending movements with a badge", () => {
    renderRow({ status: "PENDING" });

    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("shows no badge for completed movements", () => {
    renderRow({ status: "COMPLETED" });

    expect(screen.queryByText("Pendiente")).not.toBeInTheDocument();
  });
});
