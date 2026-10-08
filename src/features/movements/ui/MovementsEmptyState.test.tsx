import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MovementsEmptyState } from "./MovementsEmptyState";

describe("MovementsEmptyState", () => {
  it("explains that there are no movements yet when nothing is filtered", () => {
    render(<MovementsEmptyState filters={{}} />);

    expect(
      screen.getByRole("heading", { name: "Todavía no tenés movimientos" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Limpiar filtros" }),
    ).not.toBeInTheDocument();
  });

  it("quotes the search text when a search has no results", () => {
    render(<MovementsEmptyState filters={{ query: "zzz" }} />);

    expect(
      screen.getByRole("heading", {
        name: "No encontramos movimientos para “zzz”",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Limpiar filtros" }),
    ).toHaveAttribute("href", "/movimientos");
  });

  it("mentions the filter when only a type is selected", () => {
    render(<MovementsEmptyState filters={{ type: "SENT" }} />);

    expect(
      screen.getByRole("heading", {
        name: "No encontramos movimientos con este filtro",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Limpiar filtros" }),
    ).toBeInTheDocument();
  });
});
