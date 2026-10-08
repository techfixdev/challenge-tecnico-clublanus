import { expect, test, type Page } from "@playwright/test";

import {
  bringCardForward,
  movementRows,
  recipientSearch,
} from "./fixtures/screens";
import { login, waitForHomeToSettle } from "./fixtures/session";

/**
 * Seed facts (prisma/seed.ts): 33 movements (27 plus the six past transfers the demo user
 * sent), 8 received, 11 subscriptions, 2 from Adobe.
 */
const SEED = {
  total: 33,
  received: 8,
  subscriptions: 11,
  adobe: 2,
  pageSize: 20,
};

function dayHeaders(page: Page) {
  return page
    .getByRole("region", { name: "Lista de movimientos" })
    .getByRole("heading", { level: 2 });
}

function chip(page: Page, name: string) {
  return page
    .getByRole("navigation", { name: "Filtrar por tipo" })
    .getByRole("link", { name, exact: true });
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("home → search → filter → detail → back", async ({ page }) => {
  // The cards' eyes are pressed below: Home must be ready for a tap.
  await waitForHomeToSettle(page);
  // Home: balance card and the five latest movements.
  const card = page.getByRole("region", {
    name: "Tarjeta Mastercard terminada en 1234",
  });
  // Two currencies, one format: the dollar Mastercard and the peso Visa (es-AR digits,
  // the chip names the currency, screen readers hear it in words).
  await expect(card).toContainText("USD");
  // Balances are masked until each card's eye reveals them.
  await expect(card).toContainText("Saldo oculto");
  await page
    .getByRole("button", {
      name: "Mostrar datos de la tarjeta Mastercard terminada en 1234",
    })
    .click();
  await expect(card).toContainText("978,85 dólares");
  const pesos = page.getByRole("region", {
    name: "Tarjeta Visa terminada en 5678",
  });
  await expect(pesos).toContainText("ARS");
  await bringCardForward(page, 2, 2);
  await page
    .getByRole("button", {
      name: "Mostrar datos de la tarjeta Visa terminada en 5678",
    })
    .click();
  await expect(pesos).toContainText("312.400,50 pesos");
  const latest = page.getByRole("region", { name: "Últimos movimientos" });
  await expect(latest.getByRole("listitem")).toHaveCount(5);
  await expect(latest.getByRole("listitem").first()).toContainText("Adobe");
  // Money out carries a minus sign (U+2212), money in a plus.
  await expect(latest.getByRole("listitem").first()).toContainText(
    "\u2212US$ 125",
  );

  // The search icon opens Movements with the search box focused.
  await page.getByRole("link", { name: "Buscar movimientos" }).click();
  await expect(page).toHaveURL(/\/movimientos\?focus=1$/);
  const search = page.getByRole("searchbox", { name: "Buscar movimientos" });
  await expect(search).toBeFocused();

  // Typing filters through the URL (debounced, server-side).
  await search.fill("adobe");
  await expect(page).toHaveURL(/\/movimientos\?q=adobe$/);
  await expect(page.getByRole("status")).toHaveText(
    `${SEED.adobe} movimientos`,
  );
  await expect(movementRows(page)).toHaveCount(SEED.adobe);
  for (const row of await movementRows(page).all()) {
    await expect(row).toContainText("Adobe");
  }

  // Quick filter chip.
  await page.getByRole("button", { name: "Borrar búsqueda" }).click();
  await expect(page).toHaveURL(/\/movimientos$/);
  await chip(page, "Recibido").click();
  await expect(page).toHaveURL(/\/movimientos\?type=recibido$/);
  await expect(chip(page, "Recibido")).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("status")).toHaveText(
    `${SEED.received} movimientos`,
  );
  await expect(movementRows(page)).toHaveCount(SEED.received);

  // Detail, then back to the same filtered list.
  await movementRows(page).first().getByRole("link").click();
  await expect(page).toHaveURL(/\/movimientos\/c[a-z0-9]+\?type=recibido$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Ronaldo" }),
  ).toBeVisible();
  await expect(page.getByText("+US$ 95")).toBeVisible();
  await expect(page.getByText("GB-000002")).toBeVisible();

  await page.getByRole("link", { name: "Volver" }).click();
  await expect(page).toHaveURL(/\/movimientos\?type=recibido$/);
  await expect(chip(page, "Recibido")).toHaveAttribute("aria-current", "true");
});

test("a sent transfer's detail shares, copies and repeats it", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  // The seeded transfer to the second user (prisma/seed.ts).
  await page.goto("/movimientos?type=enviado");
  await movementRows(page)
    .filter({ hasText: "Hincha Granate" })
    .first()
    .getByRole("link")
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Hincha Granate" }),
  ).toBeVisible();

  // An iOS navigation bar: a bare chevron (≥ 44×44) and the screen's title.
  const back = page.getByRole("link", { name: "Volver" });
  await expect(back).toHaveText("");
  const box = await back.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await expect(page.getByTestId("nav-bar-title")).toHaveText("Movimiento");

  // One status: the badge, no "Estado" row repeating it.
  await expect(page.getByText("Completado")).toHaveCount(1);
  await expect(page.getByText("Estado")).toHaveCount(0);

  // Desktop Chromium has no share sheet here: the receipt is copied instead.
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", { value: undefined });
  });
  await page.getByRole("button", { name: "Compartir comprobante" }).click();
  await expect(page.getByRole("status")).toHaveText("Copiado");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Comprobante de GranaBank",
  );

  await page.getByRole("link", { name: "Repetir transferencia" }).click();
  await expect(page).toHaveURL(/\/transferir\?to=hincha\.granate$/);
  // Resolved on the server: the flow opens on the amount step, addressed to them.
  await expect(
    page.getByRole("heading", { level: 1, name: "¿Cuánto le enviás?" }),
  ).toBeVisible();
  await expect(page.getByText("hincha.granate")).toBeVisible();
});

test("the send flow ignores a ?to= it cannot use", async ({ page }) => {
  // A CVU never travels in a link, and the user's own alias is no recipient.
  for (const to of ["0000003100010000000176", "soy.granate.lanus"]) {
    await page.goto(`/transferir?to=${to}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "¿A quién le enviás?" }),
    ).toBeVisible();
  }
  await expect(recipientSearch(page)).toHaveValue("soy.granate.lanus");
});

test("the search box is at least 16px so iOS does not zoom on focus", async ({
  page,
}) => {
  await page.goto("/movimientos");
  const fontSize = await page
    .getByRole("searchbox", { name: "Buscar movimientos" })
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(16);
});

test("search ignores accents and case, and treats wildcards literally", async ({
  page,
}) => {
  await page.goto("/movimientos?q=jose");
  await expect(movementRows(page).first()).toContainText("José Suárez");
  for (const row of await movementRows(page).all()) {
    await expect(row).toContainText("José Suárez");
  }

  await page.goto("/movimientos?q=SUSCRIPCION");
  await expect(page.getByRole("status")).toHaveText(
    `${SEED.subscriptions} movimientos`,
  );

  // "%" is a LIKE wildcard; escaped, it matches only a literal percent sign (none seeded).
  await page.goto(`/movimientos?q=${encodeURIComponent("%")}`);
  await expect(
    page.getByRole("heading", { name: "No encontramos movimientos para “%”" }),
  ).toBeVisible();
});

test("a movement detail answers HTTP 200", async ({ page }) => {
  await page.goto("/movimientos");
  const href = await movementRows(page)
    .first()
    .getByRole("link")
    .getAttribute("href");
  const response = await page.goto(href ?? "");
  expect(response?.status()).toBe(200);
});

test("loads more movements with cursor pagination", async ({ page }) => {
  await page.goto("/movimientos");
  await expect(movementRows(page)).toHaveCount(SEED.pageSize);

  await page.getByRole("button", { name: "Cargar más" }).click();

  await expect(movementRows(page)).toHaveCount(SEED.total);
  await expect(page.getByRole("button", { name: "Cargar más" })).toHaveCount(0);
  // The next page joined the day groups it continues: no day header appears twice.
  const days = await dayHeaders(page).allTextContents();
  expect(new Set(days).size).toBe(days.length);
});

test("groups movements by day under headers that stick below the filters", async ({
  page,
}) => {
  await page.goto("/movimientos");
  await expect(movementRows(page)).toHaveCount(SEED.pageSize);
  expect(await dayHeaders(page).count()).toBeGreaterThan(1);

  await page.mouse.wheel(0, 1200);
  const filters = page.getByTestId("sticky-filters");
  await expect
    .poll(async () => {
      const box = await filters.boundingBox();
      const bottom = Math.round((box?.y ?? 0) + (box?.height ?? 0));
      const tops = await dayHeaders(page).evaluateAll((headers) =>
        headers.map((header) => Math.round(header.getBoundingClientRect().top)),
      );
      return tops.some((top) => Math.abs(top - bottom) <= 1);
    })
    .toBe(true);
});

test("shows the empty state for a search without results, and clears it", async ({
  page,
}) => {
  await page.goto("/movimientos?q=zzzz");

  await expect(
    page.getByRole("heading", {
      name: "No encontramos movimientos para “zzzz”",
    }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Limpiar filtros" }).click();
  await expect(page).toHaveURL(/\/movimientos$/);
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(movementRows(page)).toHaveCount(SEED.pageSize);
});

test("ignores invalid filter params instead of failing", async ({ page }) => {
  await page.goto("/movimientos?type=hackeo");

  await expect(chip(page, "Todos")).toHaveAttribute("aria-current", "true");
  await expect(movementRows(page)).toHaveCount(SEED.pageSize);
});

test("unknown, malformed or foreign movement ids show not found", async ({
  page,
}) => {
  // A well-formed id that is not ours looks exactly like one that does not exist.
  // The page is not wrapped in a loading boundary, so it answers a real HTTP 404.
  for (const id of ["cmuvt8zut00035dm6aaaaaaaa", "not-an-id"]) {
    const response = await page.goto(`/movimientos/${id}`);
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "No encontramos este movimiento" }),
    ).toBeVisible();
  }

  const api = await page.request.get(
    "/api/movements/cmuvt8zut00035dm6aaaaaaaa",
  );
  expect(api.status()).toBe(404);
  expect(await api.json()).toEqual({
    error: { code: "NOT_FOUND", message: "No encontramos ese movimiento" },
  });
});

test("the REST API requires a session", async ({ playwright, baseURL }) => {
  const anonymous = await playwright.request.newContext({ baseURL });

  const response = await anonymous.get("/api/movements");

  expect(response.status()).toBe(401);
  expect((await response.json()).error.code).toBe("UNAUTHORIZED");
  await anonymous.dispose();
});
