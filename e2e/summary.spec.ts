import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("soygranate@clublanus.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("GRANATE1@");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

function amountText(amount: string, sign: "+" | "−") {
  const value = Number(amount);
  const money = `$${value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  })}`;
  return value === 0 ? money : `${sign}${money}`;
}

test("shows this month's income and expenses, whatever the filters", async ({
  page,
}) => {
  await login(page);
  const api = await page.request.get("/api/movements/summary");
  expect(api.status()).toBe(200);
  const { data } = await api.json();

  await page.goto("/movimientos");
  const summary = page.getByRole("region", { name: /^Resumen de / });
  await expect(summary).toContainText(
    `Ingresos${amountText(data.income, "+")}`,
  );
  await expect(summary).toContainText(
    `Egresos${amountText(data.expenses, "−")}`,
  );
  const unfiltered = await summary.textContent();

  // The summary describes the month, not the current view.
  await page.goto("/movimientos?q=zzzz&type=enviado");
  await expect(
    page.getByRole("heading", { name: /No encontramos movimientos/ }),
  ).toBeVisible();
  await expect(summary).toHaveText(unfiltered ?? "");
});

test("the summary API validates the month", async ({ page }) => {
  await login(page);

  const invalid = await page.request.get(
    "/api/movements/summary?month=2026-13",
  );
  expect(invalid.status()).toBe(400);
  expect((await invalid.json()).error.code).toBe("INVALID_INPUT");

  const past = await page.request.get("/api/movements/summary?month=1999-01");
  expect(await past.json()).toEqual({
    data: {
      month: "1999-01",
      currency: "USD",
      income: "0.00",
      expenses: "0.00",
    },
  });
});
