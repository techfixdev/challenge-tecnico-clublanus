import { expect, test, type Page } from "@playwright/test";

/*
 * Premium motion on real rendering (jsdom has no layout or 3D transforms). Each check
 * runs with and without `prefers-reduced-motion: reduce`.
 */

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("soygranate@clublanus.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("GRANATE1@");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

function primaryCardSurface(page: Page) {
  return page.getByTestId("living-card-surface").first();
}

/** Presses the primary card in its center and drags towards its top-right corner. */
async function dragPrimaryCard(page: Page) {
  const box = await page.getByTestId("living-card").first().boundingBox();
  if (!box) throw new Error("The primary card is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.95, box.y + box.height * 0.1, {
    steps: 8,
  });
}

function surfaceTransform(page: Page) {
  return primaryCardSurface(page).evaluate(
    (element) => getComputedStyle(element).transform,
  );
}

test.describe("with motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the card tilts under the finger and springs back on release", async ({
    page,
  }) => {
    await login(page);
    expect(await surfaceTransform(page)).toBe("none");

    await dragPrimaryCard(page);
    // A 3D rotation shows up as a matrix3d once the spring moves.
    await expect.poll(() => surfaceTransform(page)).toContain("matrix3d");

    await page.mouse.up();
    await expect.poll(() => surfaceTransform(page)).toBe("none");
  });

  test("swiping to the next card scales it up and moves the dot", async ({
    page,
  }) => {
    await login(page);
    const cards = page.getByRole("list", { name: "Tus tarjetas" });
    const visa = cards.getByRole("listitem").nth(1);
    const scaleOf = () =>
      visa.evaluate((element) => getComputedStyle(element).transform);

    // The peeking card rests smaller (scale 0.92) until it becomes the active one.
    expect(await scaleOf()).toMatch(/^matrix\(0\.92/);

    await page.getByRole("button", { name: "Tarjeta 2 de 2" }).click();

    await expect(
      page.getByRole("button", { name: "Tarjeta 2 de 2" }),
    ).toHaveAttribute("aria-current", "true");
    await expect.poll(scaleOf).toBe("none");
  });
});

test.describe("with prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("the card stays flat when dragged, and cards do not scale", async ({
    page,
  }) => {
    await login(page);
    await dragPrimaryCard(page);
    expect(await surfaceTransform(page)).toBe("none");
    await page.mouse.up();

    const visa = page
      .getByRole("list", { name: "Tus tarjetas" })
      .getByRole("listitem")
      .nth(1);
    expect(
      await visa.evaluate((element) => getComputedStyle(element).transform),
    ).toBe("none");
    await expect(page.getByTestId("card-sweep")).toHaveCount(0);
  });
});
