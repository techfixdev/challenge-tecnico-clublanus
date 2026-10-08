import { expect, test } from "@playwright/test";

import { formatSignedMoney } from "../src/shared/lib/format";
import { login } from "./fixtures/session";

type CurrencyTotals = { currency: string; income: string; expenses: string };

test("shows this month's income and expenses, whatever the filters", async ({
  page,
}) => {
  await login(page);
  const api = await page.request.get("/api/movements/summary");
  expect(api.status()).toBe(200);
  const { data } = await api.json();

  // One total per currency of the account, dollars (primary card) first: never summed.
  expect(data.totals.map((t: CurrencyTotals) => t.currency)).toEqual([
    "USD",
    "ARS",
  ]);

  await page.goto("/movimientos");
  const summary = page.getByRole("region", { name: /^Resumen de / });
  for (const totals of data.totals as CurrencyTotals[]) {
    const line = summary.locator(`dl[data-currency="${totals.currency}"]`);
    await expect(line).toContainText(
      `Ingresos${formatSignedMoney(totals.income, totals.currency, "in")}`,
    );
    await expect(line).toContainText(
      `Egresos${formatSignedMoney(totals.expenses, totals.currency, "out")}`,
    );
  }
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

  const outOfRange = await page.request.get(
    "/api/movements/summary?month=0000-01",
  );
  expect(outOfRange.status()).toBe(400);
  expect((await outOfRange.json()).error.details.fieldErrors.month).toEqual([
    "El mes debe estar entre 2000-01 y 2100-12",
  ]);

  const past = await page.request.get("/api/movements/summary?month=2000-01");
  expect(await past.json()).toEqual({
    data: {
      month: "2000-01",
      totals: [
        { currency: "USD", income: "0.00", expenses: "0.00" },
        { currency: "ARS", income: "0.00", expenses: "0.00" },
      ],
    },
  });
});
