import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BottomNav } from "./BottomNav";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

const logout = vi.fn(async () => {});

beforeEach(() => {
  navigation.pathname = "/";
});

describe("BottomNav", () => {
  it("offers Home, Movements and a logout button", () => {
    render(<BottomNav logoutAction={logout} />);

    expect(
      screen.getByRole("navigation", { name: "Principal" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Movimientos" })).toHaveAttribute(
      "href",
      "/movimientos",
    );
    expect(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    ).toHaveAttribute("type", "submit");
  });

  it("marks the current page", () => {
    render(<BottomNav logoutAction={logout} />);

    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Movimientos" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("keeps Movements highlighted inside a movement detail", () => {
    navigation.pathname = "/movimientos/abc";
    render(<BottomNav logoutAction={logout} />);

    const movements = screen.getByRole("link", { name: "Movimientos" });
    expect(movements).toHaveAttribute("aria-current", "true");
    expect(movements).toHaveClass("text-primary");
    expect(screen.getByRole("link", { name: "Inicio" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
