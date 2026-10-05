import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FilterChips } from "./FilterChips";

describe("FilterChips", () => {
  it("renders the design's quick filters as navigation links", () => {
    render(<FilterChips filters={{}} />);

    expect(
      screen.getByRole("navigation", { name: "Filtrar por tipo" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(
      ["Todos", "Débito Aut.", "Recibido", "Enviado"],
    );
  });

  it("marks 'Todos' as current when no type is selected", () => {
    render(<FilterChips filters={{}} />);

    expect(screen.getByRole("link", { name: "Todos" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: "Recibido" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks the selected type and fills it with the primary color", () => {
    render(<FilterChips filters={{ type: "RECEIVED" }} />);

    const received = screen.getByRole("link", { name: "Recibido" });
    expect(received).toHaveAttribute("aria-current", "true");
    expect(received).toHaveClass("bg-primary");
    expect(screen.getByRole("link", { name: "Todos" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("keeps the search text in every chip link", () => {
    render(<FilterChips filters={{ query: "juan", type: "RECEIVED" }} />);

    expect(screen.getByRole("link", { name: "Todos" })).toHaveAttribute(
      "href",
      "/movimientos?q=juan",
    );
    expect(screen.getByRole("link", { name: "Débito Aut." })).toHaveAttribute(
      "href",
      "/movimientos?q=juan&type=debito",
    );
    expect(screen.getByRole("link", { name: "Enviado" })).toHaveAttribute(
      "href",
      "/movimientos?q=juan&type=enviado",
    );
  });
});
