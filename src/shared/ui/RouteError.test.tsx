import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RouteError } from "./RouteError";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RouteError", () => {
  it("logs the error once with its digest, so it can be matched to the server logs", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("Server Components render error"), {
      digest: "3141592653",
    });

    render(<RouteError title="Falló" error={error} retry={vi.fn()} />);

    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("3141592653"),
      error,
    );
  });

  it("shows the friendly message and re-fetches the segment on Reintentar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    const retry = vi.fn();

    render(
      <RouteError
        title="No pudimos cargar tus movimientos"
        error={new Error("boom")}
        retry={retry}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No pudimos cargar tus movimientos",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("boom");
    expect(retry).toHaveBeenCalledOnce();
  });
});
