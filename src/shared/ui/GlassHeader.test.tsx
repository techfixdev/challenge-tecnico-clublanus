import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/test/reduced-motion";

import { GlassHeader } from "./GlassHeader";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GlassHeader", () => {
  it("renders the screen title as its heading, with the eyebrow and actions", () => {
    stubReducedMotion(false);
    render(
      <GlassHeader
        eyebrow="Hola"
        title="Granate"
        actions={<button type="button">Buscar</button>}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Granate" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hola")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buscar" })).toBeInTheDocument();
  });

  it("sticks with a negative top, so it compacts without changing its height", () => {
    stubReducedMotion(false);
    const { rerender } = render(<GlassHeader eyebrow="Hola" title="Granate" />);
    expect(screen.getByTestId("glass-header").style.top).toMatch(
      /^calc\(.*-44px.*safe-area-inset-top.*\)$/,
    );

    rerender(<GlassHeader title="Movimientos" />);
    expect(screen.getByTestId("glass-header").style.top).toMatch(
      /^calc\(.*-28px.*safe-area-inset-top.*\)$/,
    );
  });

  it("starts without glass at the top of the page", () => {
    stubReducedMotion(false);
    render(<GlassHeader title="Movimientos" />);

    expect(screen.getByTestId("glass-header-backdrop").style.opacity).toBe("0");
  });

  it("does not scale the title under prefers-reduced-motion", () => {
    stubReducedMotion(true);
    render(<GlassHeader title="Movimientos" />);

    expect(screen.getByTestId("glass-header-title").style.transform).toBe(
      "none",
    );
  });
});
