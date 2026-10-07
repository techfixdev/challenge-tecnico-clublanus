import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/test/reduced-motion";

import { BrandIntro } from "./BrandIntro";

class FakeCSSAnimation {
  constructor(
    public animationName: string,
    public playState: AnimationPlayState,
    public currentTime: number,
  ) {}
  effect = { getTiming: () => ({ delay: 420 }) };
}

function stubIntroAnimations(...animations: FakeCSSAnimation[]) {
  vi.stubGlobal("CSSAnimation", FakeCSSAnimation);
  Object.assign(HTMLElement.prototype, { getAnimations: () => animations });
}

beforeEach(() => {
  stubReducedMotion(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, "getAnimations");
});

describe("BrandIntro", () => {
  it("stays while its dissolve has yet to run", () => {
    stubIntroAnimations(
      new FakeCSSAnimation("brand-intro-dissolve", "running", 100),
    );
    render(<BrandIntro>shield</BrandIntro>);

    expect(screen.getByTestId("brand-intro")).toBeInTheDocument();
  });

  it("unmounts when the dissolve already ended before React hydrated", () => {
    // Its animationend fired before React listened, so no event will ever come.
    stubIntroAnimations(
      new FakeCSSAnimation("brand-intro-dissolve", "finished", 580),
    );
    render(<BrandIntro>shield</BrandIntro>);

    expect(screen.queryByTestId("brand-intro")).not.toBeInTheDocument();
  });
});
