import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/test/reduced-motion";

import { NavBar } from "./NavBar";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NavBar", () => {
  it("shows a bare chevron named Volver that links back, and the screen title", () => {
    stubReducedMotion(false);
    render(<NavBar title="Movimiento" back={{ href: "/movimientos" }} />);

    const back = screen.getByRole("link", { name: "Volver" });
    expect(back).toHaveAttribute("href", "/movimientos");
    // The chevron is the only thing drawn: the name is for assistive tech, not a label.
    expect(back).toHaveTextContent("");
    expect(back.querySelector("svg")).not.toBeNull();
    // At least 44×44 (Apple HIG), as Tailwind's size-11.
    expect(back).toHaveClass("size-11");
    expect(screen.getByTestId("nav-bar-title")).toHaveTextContent("Movimiento");
    // Not a second h1: the screen keeps its own heading.
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("goes back a step with a button when given a handler", async () => {
    stubReducedMotion(false);
    const onBack = vi.fn();
    render(<NavBar title="Transferir" back={{ onBack }} trailing="Paso 2" />);

    await userEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.getByText("Paso 2")).toBeInTheDocument();
  });

  it("starts without glass at the top of the page", () => {
    stubReducedMotion(false);
    render(<NavBar title="Recibir" back={{ href: "/" }} />);

    expect(screen.getByTestId("nav-bar-backdrop").style.opacity).toBe("0");
  });
});
