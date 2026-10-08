import { expect, test, type Locator, type Page } from "@playwright/test";

import { login } from "./fixtures/session";
import { settle } from "./fixtures/view-transitions";

/*
 * Sending money is a focused task: no bottom nav inside it, and each step's primary
 * action stays pinned to the bottom of the screen, fully visible and tappable without
 * scrolling. Nothing here confirms a transfer (read-only for the shared test database).
 * Outside it, the nav is the design's: the two sections and, last, signing out.
 */

/**
 * Inside the viewport and on top at its center: a tap there reaches it. "On top" is
 * polled: while a step rearranges in place, the browser does not hit-test the elements
 * still animating, and the check is about where the action rests.
 */
async function expectTappableWithoutScrolling(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  const box = await target.boundingBox();
  const viewport = page.viewportSize();
  expect(box, "the action has a box").not.toBeNull();
  if (!box || !viewport) return;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  await expect
    .poll(
      () =>
        target.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const hit = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          );
          return hit !== null && element.contains(hit);
        }),
      { message: "nothing covers the action" },
    )
    .toBe(true);
}

test.describe("the transfer flow is a focused task", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("hides the bottom nav and pins every step's action on screen", async ({
    page,
  }) => {
    await page.goto("/transferir");
    await expect(
      page.getByRole("heading", { name: "¿A quién le enviás?" }),
    ).toBeVisible();
    // A cold load: the screen is still dissolving in until it settles.
    await settle(page);
    await expect(
      page.getByRole("navigation", { name: "Principal" }),
    ).toHaveCount(0);

    const proceed = page.getByRole("button", { name: "Continuar" });
    // Nothing typed yet: the action is there, and clearly disabled.
    await expectTappableWithoutScrolling(page, proceed);
    await expect(proceed).toBeDisabled();

    await page.getByLabel("Alias o CVU").fill("hincha.granate");
    await expectTappableWithoutScrolling(page, proceed);
    await proceed.click();

    // The amount step is taller than the screen: the action still sits on it.
    await expect(
      page.getByRole("heading", { name: "¿Cuánto le enviás?" }),
    ).toBeVisible();
    await page.getByLabel("Monto en ARS").fill("1500");
    await expect(page.getByLabel("Monto en ARS")).toHaveValue("1.500");
    await expectTappableWithoutScrolling(page, proceed);
    await page.getByLabel(/Motivo/).fill("Entradas");
    await expectTappableWithoutScrolling(page, proceed);
    await proceed.click();

    await expect(
      page.getByRole("heading", { name: "Revisá la transferencia" }),
    ).toBeVisible();
    await expectTappableWithoutScrolling(
      page,
      page.getByRole("button", { name: "Confirmar y enviar" }),
    );
    await expect(
      page.getByRole("navigation", { name: "Principal" }),
    ).toHaveCount(0);
  });

  test("brings the bottom nav back once the flow is left", async ({ page }) => {
    await page.goto("/transferir");
    await page.getByRole("link", { name: "Volver" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("navigation", { name: "Principal" }),
    ).toBeVisible();
  });
});

test("the bottom nav holds the design's items: the sections and signing out", async ({
  page,
}) => {
  await login(page);
  const nav = page.getByRole("navigation", { name: "Principal" });
  await expect(nav.getByRole("listitem")).toHaveCount(3);
  await expect(nav.getByRole("link", { name: "Inicio" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Movimientos" })).toBeVisible();
  await expect(
    nav.getByRole("listitem").last().getByRole("button", {
      name: "Cerrar sesión",
    }),
  ).toBeVisible();
  // Home's header is the design's: no avatar, no profile sheet.
  await expect(page.getByRole("button", { name: "Tu perfil" })).toHaveCount(0);
});

test("signs out from the bottom nav with one press", async ({ page }) => {
  await login(page);
  await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("button", { name: "Cerrar sesión" })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
