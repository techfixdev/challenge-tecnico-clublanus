import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { resetRowEntranceWindowForTests } from "@/shared/ui/motion/row-entrance";

import { HOME_ENTERED, HOME_ENTERING } from "./home-entrance";
import { HomeEntrance } from "./HomeEntrance";

const root = document.documentElement;

function renderWithIntro() {
  return render(
    <>
      <div className="brand-intro" />
      <HomeEntrance />
    </>,
  );
}

afterEach(() => {
  root.removeAttribute(HOME_ENTERED);
  root.removeAttribute(HOME_ENTERING);
  resetRowEntranceWindowForTests();
});

describe("HomeEntrance", () => {
  it("plays behind the intro when the app opens, then never again", async () => {
    renderWithIntro();

    expect(root).toHaveAttribute(HOME_ENTERING);
    // jsdom runs no CSS animations: the entrance is over as soon as it is followed.
    await waitFor(() => expect(root).toHaveAttribute(HOME_ENTERED));
    expect(root).not.toHaveAttribute(HOME_ENTERING);
  });

  it("skips the entrance on a navigation inside the app (no intro): Home is just there", () => {
    render(<HomeEntrance />);

    expect(root).toHaveAttribute(HOME_ENTERED);
    expect(root).not.toHaveAttribute(HOME_ENTERING);
  });

  it("finishes an entrance that came with the page after the intro was gone", async () => {
    const container = document.body.appendChild(document.createElement("div"));
    // Server HTML being hydrated: HomeEntrance renders nothing on the server.
    render(<HomeEntrance />, { container, hydrate: true });

    // Not cut short: it is marked entered only once it has played. No intro to wait
    // for, so the hand-off delay is not held either.
    expect(root).not.toHaveAttribute(HOME_ENTERED);
    expect(root).not.toHaveAttribute(HOME_ENTERING);
    await waitFor(() => expect(root).toHaveAttribute(HOME_ENTERED));
  });

  it("does not replay on a return to Home, even under a new intro", () => {
    root.setAttribute(HOME_ENTERED, "");

    renderWithIntro();

    expect(root).not.toHaveAttribute(HOME_ENTERING);
  });

  it("closes the row-entrance window: the app's lists have built once", async () => {
    renderWithIntro();

    await waitFor(() => expect(root).toHaveAttribute("data-rows-entered"));
  });
});
