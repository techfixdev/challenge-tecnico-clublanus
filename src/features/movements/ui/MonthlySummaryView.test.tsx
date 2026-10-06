import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MonthlySummaryView } from "./MonthlySummaryView";

describe("MonthlySummaryView", () => {
  it("shows the month with its income and expenses", () => {
    render(
      <MonthlySummaryView
        summary={{
          month: "2026-10",
          currency: "USD",
          income: "95.00",
          expenses: "250.49",
        }}
      />,
    );

    const region = screen.getByRole("region", { name: "Resumen de Octubre" });
    expect(region).toHaveTextContent("Octubre");
    expect(screen.getByText("Ingresos").nextElementSibling).toHaveTextContent(
      "+$95",
    );
    expect(screen.getByText("Egresos").nextElementSibling).toHaveTextContent(
      "−$250.49",
    );
  });

  it("shows $0 for a month without movements", () => {
    render(
      <MonthlySummaryView
        summary={{
          month: "2026-10",
          currency: "USD",
          income: "0.00",
          expenses: "0.00",
        }}
      />,
    );

    expect(screen.getAllByText("$0")).toHaveLength(2);
  });
});
