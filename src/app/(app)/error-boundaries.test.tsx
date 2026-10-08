import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import AccountError from "./error";
import MovementsError from "./movimientos/error";

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each([
  ["signed-in area", AccountError, "No pudimos cargar tu cuenta"],
  ["movements", MovementsError, "No pudimos cargar tus movimientos"],
])("%s error boundary", (_label, Boundary, title) => {
  it("names what failed and wires Reintentar to Next's retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    const retry = vi.fn();

    render(<Boundary error={new Error("boom")} retry={retry} />);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(retry).toHaveBeenCalledOnce();
  });
});
