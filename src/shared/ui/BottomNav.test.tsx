import { render, screen } from "@testing-library/react";
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
  it("offers the sections only: Home and Movements, no sign-out", () => {
    render(<BottomNav />);

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
    // Signing out lives in the profile sheet on Home, behind a confirmation.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each(["/transferir"])(
    "steps aside inside a focused task (%s), so its actions own the bottom",
    (pathname) => {
      navigation.pathname = pathname;
      render(<BottomNav />);

      expect(
        screen.queryByRole("navigation", { name: "Principal" }),
      ).not.toBeInTheDocument();
    },
  );

  it("marks the current page and puts the sliding indicator under it", () => {
    render(<BottomNav />);

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
    render(<BottomNav />);

    const movements = screen.getByRole("link", { name: "Movimientos" });
    expect(movements).toHaveAttribute("aria-current", "true");
    expect(movements).toHaveClass("text-primary");
    expect(movements).toContainElement(screen.getByTestId("nav-indicator"));
    expect(screen.getByRole("link", { name: "Inicio" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
