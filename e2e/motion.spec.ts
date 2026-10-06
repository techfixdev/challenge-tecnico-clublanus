import { expect, test, type Page } from "@playwright/test";

/*
 * Motion checks on real computed styles (jsdom has no CSS). Each case runs with and
 * without `prefers-reduced-motion: reduce` to prove the preference turns movement off.
 */

/** Computed `animation-name` of a throwaway skeleton's shimmer highlight. */
function shimmerAnimation(page: Page) {
  return page.evaluate(() => {
    const element = document.createElement("span");
    element.className = "skeleton block h-4 w-10";
    document.body.append(element);
    const name = getComputedStyle(element, "::after").animationName;
    element.remove();
    return name;
  });
}

/** Computed `scale` of the login button while it is held down (`:active`). */
async function pressedScale(page: Page) {
  const button = page.getByRole("button", { name: "Ingresar" });
  const box = await button.boundingBox();
  if (!box) throw new Error("The login button is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // Wait past the press transition, then read the settled value.
  await page.waitForTimeout(300);
  const scale = await button.evaluate(
    (element) => getComputedStyle(element).scale,
  );
  await page.mouse.up();
  return scale;
}

test.describe("with motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });

  test("skeletons shimmer and pressed buttons shrink", async ({ page }) => {
    await page.goto("/login");

    expect(await shimmerAnimation(page)).toBe("skeleton-shimmer");
    expect(await pressedScale(page)).toBe("0.97");
  });
});

test.describe("with prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("skeletons stay static and pressed buttons do not move", async ({
    page,
  }) => {
    await page.goto("/login");

    expect(await shimmerAnimation(page)).toBe("none");
    expect(await pressedScale(page)).toBe("none");
  });
});
