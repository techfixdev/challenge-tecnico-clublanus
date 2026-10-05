import { expect, test } from "@playwright/test";

const DEMO_USER = {
  email: "soygranate@clublanus.com",
  password: "GRANATE1@",
};

test("redirects anonymous visitors from private pages to /login", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/movimientos");
  await expect(page).toHaveURL(/\/login$/);
});

test("shows a generic error for wrong credentials and keeps the email", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_USER.email);
  await page.getByLabel("Contraseña", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Email o contraseña incorrectos" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(DEMO_USER.email);
  await expect(page).toHaveURL(/\/login$/);
});

test("validates fields on the client before submitting", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.getByText("Ingresá tu email")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("logs in, keeps /login out of reach, and logs out", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_USER.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(DEMO_USER.password);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Granate" })).toBeVisible();

  const [sessionCookie] = (await context.cookies()).filter(
    (cookie) => cookie.name === "granabank_session",
  );
  expect(sessionCookie.httpOnly).toBe(true);
  expect(sessionCookie.sameSite).toBe("Lax");
  expect(sessionCookie.expires).toBe(-1); // session cookie: "Recordarme" unchecked

  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("'Recordarme' issues a persistent 30-day cookie", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_USER.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(DEMO_USER.password);
  await page.getByLabel("Recordarme").check();
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);

  const [sessionCookie] = (await context.cookies()).filter(
    (cookie) => cookie.name === "granabank_session",
  );
  const daysLeft = (sessionCookie.expires - Date.now() / 1000) / 86_400;
  expect(daysLeft).toBeGreaterThan(29.9);
  expect(daysLeft).toBeLessThanOrEqual(30);
});
