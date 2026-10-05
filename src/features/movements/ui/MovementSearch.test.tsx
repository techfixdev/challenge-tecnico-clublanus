import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MovementSearch, SEARCH_DEBOUNCE_MS } from "./MovementSearch";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

beforeEach(() => {
  replace.mockReset();
});

describe("MovementSearch", () => {
  it("renders a labelled search box with the design placeholder", () => {
    render(<MovementSearch filters={{ query: "adobe" }} />);

    const input = screen.getByRole("searchbox", { name: "Buscar movimientos" });
    expect(input).toHaveAttribute(
      "placeholder",
      "Ingresá un nombre o servicio",
    );
    expect(input).toHaveAttribute("maxlength", "50");
    expect(input).toHaveValue("adobe");
  });

  it("updates the URL once, after the user stops typing, keeping the type filter", async () => {
    const user = userEvent.setup();
    render(<MovementSearch filters={{ type: "RECEIVED" }} />);

    await user.type(screen.getByRole("searchbox"), "ronal");

    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1), {
      timeout: SEARCH_DEBOUNCE_MS * 4,
    });
    expect(replace).toHaveBeenCalledWith("/movimientos?q=ronal&type=recibido", {
      scroll: false,
    });
  });

  it("clears the search with an accessible button", async () => {
    const user = userEvent.setup();
    render(<MovementSearch filters={{ query: "adobe" }} />);

    await user.click(screen.getByRole("button", { name: "Borrar búsqueda" }));

    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("searchbox")).toHaveFocus();
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/movimientos", { scroll: false }),
    );
  });

  it("can take focus on arrival (search icon on Home)", () => {
    render(<MovementSearch filters={{}} autoFocus />);

    expect(screen.getByRole("searchbox")).toHaveFocus();
  });
});
