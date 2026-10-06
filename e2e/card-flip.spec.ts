import { expect, test, type Page } from "@playwright/test";

/*
 * Card flip on real rendering (jsdom has no 3D transforms or hit-testing): a tap or the
 * keyboard turns the card over, a swipe or a tilt drag does not, and under reduced motion
 * the back fades in without any rotation.
 */

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("soygranate@clublanus.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("GRANATE1@");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

const FLIP_MASTERCARD =
  "Ver reverso de la tarjeta Mastercard terminada en 1234";

function flipButton(page: Page, name = FLIP_MASTERCARD) {
  return page.getByRole("button", { name });
}

function back(page: Page) {
  return page.getByRole("region", {
    name: "Reverso de la tarjeta Mastercard terminada en 1234",
  });
}

function surface(page: Page) {
  return page.getByTestId("living-card-surface").first();
}

/** The angle the card is turned to, from its computed matrix (0 = front, 180 = back). */
function turnedAngle(page: Page) {
  return surface(page).evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    if (transform === "none") return 0;
    const matrix = new DOMMatrix(transform);
    // m11 = cos(rotateY) scaled, m13 = -sin(rotateY) scaled.
    return Math.round(
      Math.abs((Math.atan2(-matrix.m13, matrix.m11) * 180) / Math.PI),
    );
  });
}

/** The center of the primary card, where a tap lands on the flip button. */
async function cardCenter(page: Page) {
  const box = await page.getByTestId("living-card").first().boundingBox();
  if (!box) throw new Error("The primary card is not visible");
  return { x: box.x + box.width * 0.5, y: box.y + box.height * 0.6 };
}

test.describe("with motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });

  test("a tap turns the card over in 3D and another tap turns it back", async ({
    page,
  }) => {
    await login(page);
    const { x, y } = await cardCenter(page);

    await page.mouse.click(x, y);

    await expect(flipButton(page)).toHaveAttribute("aria-pressed", "true");
    await expect(back(page)).toBeVisible();
    await expect(back(page)).toContainText("Tocá para volver");
    // It really rotates (a 3D matrix mid-turn) and settles at 180°.
    await expect.poll(() => turnedAngle(page)).toBe(180);
    // The front is out of the accessibility tree while the back shows.
    await expect(
      page.getByRole("region", {
        name: "Tarjeta Mastercard terminada en 1234",
        exact: true,
      }),
    ).toHaveCount(0);

    await page.mouse.click(x, y);
    await expect(flipButton(page)).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => turnedAngle(page)).toBe(0);
    await expect(surface(page)).toHaveCSS("transform", "none");
  });

  test("Enter and Space flip the focused card", async ({ page }) => {
    await login(page);
    await flipButton(page).focus();

    await page.keyboard.press("Enter");
    await expect(flipButton(page)).toHaveAttribute("aria-pressed", "true");

    await page.keyboard.press("Space");
    await expect(flipButton(page)).toHaveAttribute("aria-pressed", "false");
  });

  test("the eye on the card reveals instead of flipping", async ({ page }) => {
    await login(page);

    await page
      .getByRole("button", {
        name: "Mostrar datos de la tarjeta Mastercard terminada en 1234",
      })
      .click();

    await expect(
      page.getByRole("region", {
        name: "Tarjeta Mastercard terminada en 1234",
        exact: true,
      }),
    ).toContainText("978,85 dólares");
    await expect(flipButton(page)).toHaveAttribute("aria-pressed", "false");
  });

  test("a horizontal swipe or a tilt drag does not flip the card", async ({
    page,
  }) => {
    await login(page);
    const { x, y } = await cardCenter(page);

    // Swipe-like drag to the left, released on the card.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 80, y + 4, { steps: 8 });
    await page.mouse.up();
    // Tilt drag towards a corner, released on the card.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 40, y - 30, { steps: 8 });
    await page.mouse.up();
    // A press that stays put while the carousel scrolls under it.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page
      .getByRole("list", { name: "Tus tarjetas" })
      .evaluate((list) => list.scrollBy({ left: 40, behavior: "instant" }));
    await page.mouse.up();

    await expect(flipButton(page)).toHaveAttribute("aria-pressed", "false");
    // The tilt springs back to flat; the card never turned over.
    await expect.poll(() => turnedAngle(page)).toBe(0);
  });

  test("a swipe to the next card leaves both cards on their front", async ({
    page,
  }) => {
    await login(page);
    await page.getByRole("button", { name: "Tarjeta 2 de 2" }).click();
    await expect(
      page.getByRole("button", { name: "Tarjeta 2 de 2" }),
    ).toHaveAttribute("aria-current", "true");

    for (const name of [
      FLIP_MASTERCARD,
      "Ver reverso de la tarjeta Visa terminada en 5678",
    ]) {
      await expect(flipButton(page, name)).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
  });
});

test.describe("with prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("the back fades in over the front without any rotation", async ({
    page,
  }) => {
    await login(page);
    const frontFace = page.locator("[data-face=front]").first();
    const backFace = page.locator("[data-face=back]").first();
    await expect(backFace).toHaveCSS("opacity", "0");

    await flipButton(page).click();

    await expect(flipButton(page)).toHaveAttribute("aria-pressed", "true");
    await expect(backFace).toHaveCSS("opacity", "1");
    await expect(frontFace).toHaveCSS("opacity", "0");
    await expect(surface(page)).toHaveCSS("transform", "none");
    await expect(backFace).toHaveCSS("transform", "none");
    await expect(back(page)).toContainText("CVV");
  });
});
