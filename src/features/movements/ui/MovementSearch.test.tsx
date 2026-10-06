import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MovementSearch, SEARCH_DEBOUNCE_MS } from "./MovementSearch";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

beforeEach(() => {
  replace.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

function typeInto(text: string) {
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: text } });
}

function waitForDebounce() {
  act(() => {
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
  });
}

describe("MovementSearch", () => {
  it("keeps the search box at 16px so iOS Safari does not zoom on focus", () => {
    render(<MovementSearch filters={{}} />);

    // jsdom has no Tailwind, so assert the rendered utilities: the input's own text size
    // is 16px (`text-base`) and no smaller size overrides it; only the placeholder (a
    // `placeholder:` variant, which does not trigger the zoom) may be smaller. The real
    // computed size is checked in the browser by e2e/movements.spec.ts.
    const sizeUtilities = [...screen.getByRole("searchbox").classList].filter(
      (name) => /^text-(xs|sm|base|lg|\[)/.test(name),
    );
    expect(sizeUtilities).toEqual(["text-base"]);
  });

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

  it("updates the URL once, after the user stops typing, keeping the type filter", () => {
    vi.useFakeTimers();
    render(<MovementSearch filters={{ type: "RECEIVED" }} />);

    // Keystrokes closer together than the debounce: only the last one navigates.
    for (const text of ["r", "ro", "ron", "rona", "ronal"]) {
      typeInto(text);
      act(() => {
        vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
      });
    }
    expect(replace).not.toHaveBeenCalled();
    waitForDebounce();

    expect(replace).toHaveBeenCalledOnce();
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

  describe("debounce and URL sync", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("uses the type filter that is active when the search fires, not when typing began", () => {
      const { rerender } = render(
        <MovementSearch filters={{ type: "RECEIVED" }} />,
      );

      typeInto("ron");
      // A quick-filter chip is clicked before the debounce elapses.
      rerender(<MovementSearch filters={{ type: "SENT" }} />);
      waitForDebounce();

      expect(replace).toHaveBeenCalledOnce();
      expect(replace).toHaveBeenCalledWith("/movimientos?q=ron&type=enviado", {
        scroll: false,
      });
    });

    it("drops a pending search when the URL changes from outside (back button, Limpiar filtros)", () => {
      const { rerender } = render(<MovementSearch filters={{}} />);

      typeInto("ron");
      rerender(<MovementSearch filters={{ query: "adobe" }} />);
      waitForDebounce();

      expect(screen.getByRole("searchbox")).toHaveValue("adobe");
      expect(replace).not.toHaveBeenCalled();
    });

    it("adopts an outside URL change even while the box has focus", () => {
      const { rerender } = render(
        <MovementSearch filters={{ query: "adobe" }} />,
      );
      screen.getByRole("searchbox").focus();

      rerender(<MovementSearch filters={{}} />);

      expect(screen.getByRole("searchbox")).toHaveFocus();
      expect(screen.getByRole("searchbox")).toHaveValue("");
    });

    it("keeps what the user typed after its own search lands in the URL", () => {
      const { rerender } = render(<MovementSearch filters={{}} />);

      typeInto("ron");
      waitForDebounce();
      typeInto("rona");
      // The URL catches up with the first search while the user keeps typing.
      rerender(<MovementSearch filters={{ query: "ron" }} />);
      waitForDebounce();

      expect(screen.getByRole("searchbox")).toHaveValue("rona");
      expect(replace).toHaveBeenNthCalledWith(1, "/movimientos?q=ron", {
        scroll: false,
      });
      expect(replace).toHaveBeenNthCalledWith(2, "/movimientos?q=rona", {
        scroll: false,
      });
    });

    it("cancels the pending search on unmount", () => {
      const { unmount } = render(<MovementSearch filters={{}} />);

      typeInto("ron");
      unmount();
      waitForDebounce();

      expect(replace).not.toHaveBeenCalled();
    });
  });
});
