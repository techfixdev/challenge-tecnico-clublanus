import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("soygranate@clublanus.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("GRANATE1@");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

function primaryCard(page: Page) {
  return page.getByRole("region", {
    name: "Tarjeta Mastercard terminada en 1234",
  });
}

test.describe("with prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("the balance appears final at once, without counting up", async ({
    page,
  }) => {
    await login(page);
    await expect(primaryCard(page)).toBeVisible();

    // Checked right as the card appears: a count-up would still be near 0.00 here.
    await expect(
      primaryCard(page).getByTestId("balance-amount").locator("[aria-hidden]"),
    ).toHaveText("978.85", { timeout: 50 });
  });
});
