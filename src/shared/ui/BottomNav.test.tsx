import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BottomNav } from "./BottomNav";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

beforeEach(() => {
  navigation.pathname = "/";
});

describe("BottomNav", () => {
  it("holds the design's three items: Home, Movements and signing out", () => {
    render(<BottomNav logoutAction={async () => {}} />);

    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(nav.querySelectorAll("li")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Movimientos" })).toHaveAttribute(
      "href",
      "/movimientos",
    );
    // The third item, on the right as in the design, is a submit button, not a link.
    const logout = screen.getByRole("button", { name: "Cerrar sesión" });
    expect(logout).toHaveAttribute("type", "submit");
    expect(nav.querySelectorAll("li")[2]).toContainElement(logout);
  });

  it("signs out through the logout action on a press", async () => {
    const logout = vi.fn(async () => {});
    render(<BottomNav logoutAction={logout} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    );

    expect(logout).toHaveBeenCalledOnce();
  });

  it.each(["/transferir"])(
    "steps aside inside a focused task (%s), so its actions own the bottom",
    (pathname) => {
      navigation.pathname = pathname;
      render(<BottomNav logoutAction={async () => {}} />);

      expect(
        screen.queryByRole("navigation", { name: "Principal" }),
      ).not.toBeInTheDocument();
    },
  );

  it("marks the current page and puts the sliding indicator under it", () => {
    render(<BottomNav logoutAction={async () => {}} />);

    const home = screen.getByRole("link", { name: "Inicio" });
    expect(home).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByTestId("nav-indicator")).toHaveLength(1);
    expect(home).toContainElement(screen.getByTestId("nav-indicator"));
    expect(
      screen.getByRole("link", { name: "Movimientos" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("keeps Movements highlighted inside a movement detail", () => {
    navigation.pathname = "/movimientos/abc";
    render(<BottomNav logoutAction={async () => {}} />);

    const movements = screen.getByRole("link", { name: "Movimientos" });
    expect(movements).toHaveAttribute("aria-current", "true");
    expect(movements).toHaveClass("text-primary");
    expect(movements).toContainElement(screen.getByTestId("nav-indicator"));
    expect(screen.getByRole("link", { name: "Inicio" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
