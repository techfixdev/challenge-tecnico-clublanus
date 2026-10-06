import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MonthlySummaryView } from "./MonthlySummaryView";

function totalsOf(currency: string) {
  const list = document.querySelector<HTMLElement>(
    `dl[data-currency="${currency}"]`,
  );
  if (!list) throw new Error(`No totals for ${currency}`);
  const [income, expenses] = within(list).getAllByRole("definition");
  return { income, expenses };
}

describe("MonthlySummaryView", () => {
  it("shows the month with its income and expenses", () => {
    render(
      <MonthlySummaryView
        summary={{
          month: "2026-10",
          totals: [{ currency: "USD", income: "95.00", expenses: "250.49" }],
        }}
      />,
    );

    const region = screen.getByRole("region", { name: "Resumen de Octubre" });
    expect(region).toHaveTextContent("Octubre");
    expect(screen.getByText("Ingresos").nextElementSibling).toHaveTextContent(
      "+US$ 95",
    );
    expect(screen.getByText("Egresos").nextElementSibling).toHaveTextContent(
      "−US$ 250,49",
    );
  });

  it("totals each currency on its own line, never adding them", () => {
    render(
      <MonthlySummaryView
        summary={{
          month: "2026-10",
          totals: [
            { currency: "USD", income: "95.00", expenses: "125.00" },
            { currency: "ARS", income: "185000.00", expenses: "56999.00" },
          ],
        }}
      />,
    );

    expect(screen.getAllByText("Ingresos")).toHaveLength(2);
    const dollars = totalsOf("USD");
    const pesos = totalsOf("ARS");
    expect(dollars.income).toHaveTextContent("+US$ 95");
    expect(dollars.expenses).toHaveTextContent("−US$ 125");
    expect(pesos.income).toHaveTextContent("+$ 185.000");
    expect(pesos.expenses).toHaveTextContent("−$ 56.999");
  });

  it("says each amount with its currency to screen readers", () => {
    render(
      <MonthlySummaryView
        summary={{
          month: "2026-10",
          totals: [{ currency: "ARS", income: "185000.00", expenses: "0.00" }],
        }}
      />,
    );

    expect(screen.getByText("más 185.000 pesos")).toHaveClass("sr-only");
    expect(screen.getByText("0 pesos")).toHaveClass("sr-only");
  });

  it("shows a plain zero for a month without movements", () => {
    render(
      <MonthlySummaryView
        summary={{
          month: "2026-10",
          totals: [{ currency: "USD", income: "0.00", expenses: "0.00" }],
        }}
      />,
    );

    expect(screen.getAllByText("US$ 0")).toHaveLength(2);
  });
});
