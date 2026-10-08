import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/test/reduced-motion";

import { HomeHeader } from "./HomeHeader";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HomeHeader", () => {
  it("greets the user with search and notifications only, no avatar (as the design)", () => {
    stubReducedMotion(false);
    render(<HomeHeader firstName="Granate" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Granate" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hola")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Buscar movimientos" }),
    ).toHaveAttribute("href", "/movimientos?focus=1");
    // The bell is the header's only button: signing out lives in the bottom nav.
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: "Tu perfil" }),
    ).not.toBeInTheDocument();
  });
});
