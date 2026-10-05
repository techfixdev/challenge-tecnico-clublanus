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

  it("shows counterparty, description and the amount as in the design", () => {
    renderRow({ counterparty: "Adobe", amount: "125.00" });

    expect(screen.getByText("Adobe")).toBeInTheDocument();
    expect(screen.getByText("Pago de suscripción")).toBeInTheDocument();
    expect(screen.getByText("$125")).toBeInTheDocument();
  });

  it.each([
    [
      "SUBSCRIPTION",
      "Débito automático",
      "text-subscription",
      "bg-subscription-soft",
    ],
    ["RECEIVED", "Recibido", "text-received", "bg-received-soft"],
    ["SENT", "Enviado", "text-sent", "bg-sent-soft"],
  ] as const)(
    "styles %s movements with their type colors and names the type for screen readers",
    (type, label, textClass, tileClass) => {
      const { link } = renderRow({ type, amount: "95.00" });

      expect(link).toHaveAccessibleName(expect.stringContaining(label));
      expect(screen.getByText("$95")).toHaveClass(textClass);
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
