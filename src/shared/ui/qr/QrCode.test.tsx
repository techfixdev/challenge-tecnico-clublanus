import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QrCode } from "./QrCode";

describe("QrCode", () => {
  it("renders an inline SVG image with an accessible label", () => {
    render(<QrCode value="GranaBank" label="Código QR con tu alias y CVU" />);

    const svg = screen.getByRole("img", {
      name: "Código QR con tu alias y CVU",
    });
    expect(svg.tagName.toLowerCase()).toBe("svg");
    expect(svg.querySelector("path")?.getAttribute("d")).toMatch(
      /^M4 4h7v1h-7z/,
    );
  });

  it("paints garnet modules on a white quiet zone and scales with its container", () => {
    render(<QrCode value="GranaBank" label="QR" />);

    const svg = screen.getByRole("img", { name: "QR" });
    expect(svg.querySelector("rect")).toHaveClass("fill-surface");
    expect(svg.querySelector("path")).toHaveClass("fill-primary");
    expect(svg).toHaveClass("w-full");
    expect(svg).not.toHaveAttribute("width");
  });
});
