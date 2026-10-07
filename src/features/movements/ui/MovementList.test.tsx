import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeMovement } from "@/test/movement-fixtures";

import { MovementList } from "./MovementList";

const TODAY = "2026-10-07";

function enterSteps() {
  return screen
    .getAllByRole("listitem")
    .map((item) => item.style.getPropertyValue("--row-enter-step"));
}

function movementsOn(...isoDates: string[]) {
  return isoDates.map((iso) => makeMovement({ occurredAt: new Date(iso) }));
}

describe("MovementList", () => {
  it("groups the rows under one header per day, newest first", () => {
    render(
      <MovementList
        today={TODAY}
        movements={movementsOn(
          "2026-10-07T15:00:00Z",
          "2026-10-07T12:00:00Z",
          "2026-10-06T12:00:00Z",
          "2026-10-05T12:00:00Z",
        )}
      />,
    );

    const list = screen.getByRole("region", { name: "Lista de movimientos" });
    const headers = within(list).getAllByRole("heading", { level: 2 });
    expect(headers.map((header) => header.textContent)).toEqual([
      "Hoy",
      "Ayer",
      "5 de octubre",
    ]);
    // Each day is one list, named by its header.
    expect(
      within(screen.getByRole("list", { name: "Hoy" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(2);
    expect(within(list).getAllByRole("link")).toHaveLength(4);
  });

  it("lets each row enter one stagger step after the previous one, across days", () => {
    render(
      <MovementList
        today={TODAY}
        movements={movementsOn(
          "2026-10-07T15:00:00Z",
          "2026-10-06T12:00:00Z",
          "2026-10-05T12:00:00Z",
        )}
      />,
    );

    expect(enterSteps()).toEqual(["0", "1", "2"]);
    for (const item of screen.getAllByRole("listitem")) {
      expect(item).toHaveClass("row-enter");
    }
  });

  it("staggers at most the first 6 rows of a long first paint; the rest enter with the sixth", () => {
    render(
      <MovementList
        today={TODAY}
        movements={movementsOn(
          ...Array.from(
            { length: 8 },
            (_, index) => `2026-10-07T${String(20 - index).padStart(2, "0")}:00:00Z`,
          ),
        )}
      />,
    );

    expect(enterSteps()).toEqual(["0", "1", "2", "3", "4", "5", "5", "5"]);
  });
});
