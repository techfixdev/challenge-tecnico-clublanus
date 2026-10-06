import { expect, test, type Page } from "@playwright/test";

const DEMO_USER = {
  email: "soygranate@clublanus.com",
  password: "GRANATE1@",
};

/** Seed facts (prisma/seed.ts): 26 movements, 8 received, 10 subscriptions, 2 from Adobe. */
const SEED = {
  total: 26,
  received: 8,
  subscriptions: 10,
  adobe: 2,
  pageSize: 20,
};

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_USER.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(DEMO_USER.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

function movementRows(page: Page) {
  return page
    .getByRole("list", { name: "Lista de movimientos" })
    .getByRole("listitem");
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
  // Home: balance card and the five latest movements.
  const card = page.getByRole("region", {
    name: "Tarjeta Mastercard terminada en 1234",
  });
  await expect(card).toContainText("978.85");
  const latest = page.getByRole("region", { name: "Últimos movimientos" });
  await expect(latest.getByRole("listitem")).toHaveCount(5);
  await expect(latest.getByRole("listitem").first()).toContainText("Adobe");

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
  await expect(page.getByText("+$95")).toBeVisible();
  await expect(page.getByText("GB-000002")).toBeVisible();

  await page.getByRole("link", { name: "Volver" }).click();
  await expect(page).toHaveURL(/\/movimientos\?type=recibido$/);
  await expect(chip(page, "Recibido")).toHaveAttribute("aria-current", "true");
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
