import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeMovement } from "@/test/movement-fixtures";

import { MovementList } from "./MovementList";

function enterSteps() {
  return screen
    .getAllByRole("listitem")
    .map((item) => item.style.getPropertyValue("--row-enter-step"));
}

describe("MovementList", () => {
  it("lets each row enter one stagger step after the previous one", () => {
    render(
      <MovementList
        movements={Array.from({ length: 3 }, () => makeMovement())}
      />,
    );

    expect(enterSteps()).toEqual(["0", "1", "2"]);
    for (const item of screen.getAllByRole("listitem")) {
      expect(item).toHaveClass("row-enter");
    }
  });

  it("starts the stagger at the newest batch", () => {
    render(
      <MovementList
        movements={Array.from({ length: 4 }, () => makeMovement())}
        enterFrom={2}
      />,
    );

    expect(enterSteps()).toEqual(["0", "0", "0", "1"]);
  });
});
