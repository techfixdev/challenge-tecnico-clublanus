import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MotionValue } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/test/reduced-motion";

import { NavBar } from "./NavBar";

/** The page scroll the bar reads, driven by the tests instead of a real scroll. */
const page = vi.hoisted(() => ({
  scrollY: undefined as MotionValue<number> | undefined,
}));

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();
  page.scrollY = motion.motionValue(0);
  return { ...motion, useScroll: () => ({ scrollY: page.scrollY }) };
});

/** Scrolls to `y` and waits a frame: Motion recomputes derived values on its frame loop. */
async function scrollPageTo(y: number) {
  await act(async () => {
    page.scrollY!.set(y);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  page.scrollY!.set(0);
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

  it("turns into glass as content passes under it, and clears again at the top", async () => {
    stubReducedMotion(false);
    render(<NavBar title="Recibir" back={{ href: "/" }} />);
    const backdrop = screen.getByTestId("nav-bar-backdrop");

    await scrollPageTo(20);
    expect(backdrop.style.opacity).toBe("0");

    // Halfway through the fade (20px → 32px of scroll).
    await scrollPageTo(26);
    expect(Number(backdrop.style.opacity)).toBeCloseTo(0.5);

    await scrollPageTo(200);
    expect(backdrop.style.opacity).toBe("1");

    await scrollPageTo(0);
    expect(backdrop.style.opacity).toBe("0");
  });
});
