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

test("hides every balance, and the choice survives a reload", async ({
  page,
}) => {
  await login(page);
  const toggle = page.getByRole("button", { name: "Ocultar saldo" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(primaryCard(page)).toContainText("978.85");

  await toggle.click();

  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  const cards = page.getByRole("list", { name: "Tus tarjetas" });
  await expect(cards.getByText("••••••")).toHaveCount(2);
  await expect(cards).not.toContainText("978.85");

  // The server renders the choice (cookie): the HTML already carries the mask and no
  // rendered balance, so a hidden balance never flashes before hydration.
  const html = await (await page.request.get("/")).text();
  expect(html).toContain(">••••••<");
  expect(html).not.toContain(">978.85<");

  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await toggle.click();
  await expect(primaryCard(page)).toContainText("978.85");
});

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
