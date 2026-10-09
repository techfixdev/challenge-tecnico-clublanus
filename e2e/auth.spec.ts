import { expect, test } from "@playwright/test";

import {
  APP_BACKGROUND_COLOR,
  LOGIN_THEME_COLOR,
} from "../src/shared/lib/theme";
import { DEMO_USER, fillLoginForm, login } from "./fixtures/session";

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

test("after 5 failed attempts for an email, the 6th is refused with how long to wait", async ({
  page,
}) => {
  // An email nobody registered (and no other spec uses): the limit treats it exactly like
  // a real one.
  await fillLoginForm(page, {
    email: "nadie@clublanus.com",
    password: "wrong-password",
  });
  const submit = page.getByRole("button", { name: "Ingresar" });
  const password = page.getByLabel("Contraseña", { exact: true });
  // Submits once and waits for the Server Action's answer: the previous attempt's alert
  // is still on screen, so waiting for the alert alone would not wait for this attempt
  // (and typing during the form's post-action reset would lose the password).
  async function submitWrongPassword() {
    await password.fill("wrong-password");
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname === "/login",
      ),
      submit.click(),
    ]);
    await expect(submit).toBeEnabled();
  }

  for (let attempt = 1; attempt <= 5; attempt++) {
    await submitWrongPassword();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Email o contraseña incorrectos" }),
    ).toBeVisible();
  }

  await submitWrongPassword();

  await expect(
    page.getByRole("alert").filter({
      hasText: /^Demasiados intentos\. Probá de nuevo en \d+ minutos?\.$/,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue("nadie@clublanus.com");
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
  await login(page);
  await expect(page.getByRole("heading", { name: "Granate" })).toBeVisible();

  const [sessionCookie] = (await context.cookies()).filter(
    (cookie) => cookie.name === "granabank_session",
  );
  expect(sessionCookie.httpOnly).toBe(true);
  expect(sessionCookie.sameSite).toBe("Lax");
  expect(sessionCookie.expires).toBe(-1); // session cookie: "Recordarme" unchecked

  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/);

  // Signing out is the bottom nav's last item, as in the design: one press.
  await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("button", { name: "Cerrar sesión" })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("logging out revokes the session: a copy of the cookie stops working", async ({
  page,
  context,
}) => {
  await login(page);
  const copied = (await context.cookies()).filter(
    (cookie) => cookie.name === "granabank_session",
  );
  expect(copied).toHaveLength(1);

  await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("button", { name: "Cerrar sesión" })
    .click();
  await expect(page).toHaveURL(/\/login$/);

  // Replaying the still validly signed token: the server finds its session revoked.
  await context.addCookies(copied);
  const replayed = await page.request.get("/api/movements");
  expect(replayed.status()).toBe(401);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByLabel("Email")).toBeVisible();
  // The server confirmed the session dead and deleted the cookie: no redirect loop.
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === "granabank_session",
    ),
  ).toBe(false);
});

test("a link to /login?expired=1 cannot sign a live session out", async ({
  page,
  context,
}) => {
  await login(page);
  const sessionCookie = async () =>
    (await context.cookies()).find(
      (cookie) => cookie.name === "granabank_session",
    )?.value;
  const before = await sessionCookie();

  // What a third-party page could link to: the server sees a live session and sends the
  // visitor home, with the same cookie.
  await page.goto("/login?expired=1");

  await expect(page).toHaveURL(/\/$/);
  expect(await sessionCookie()).toBe(before);
  expect((await page.request.get("/api/movements")).status()).toBe(200);
});

test("'Recordarme' issues a persistent 30-day cookie", async ({
  page,
  context,
}) => {
  await fillLoginForm(page);
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

/** iOS Safari zooms into any focused input whose computed font-size is below 16px. */
test("login inputs are at least 16px so iOS does not zoom on focus", async ({
  page,
}) => {
  await page.goto("/login");
  for (const input of [
    page.getByLabel("Email"),
    page.getByLabel("Contraseña", { exact: true }),
  ]) {
    const fontSize = await input.evaluate((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    );
    expect(fontSize).toBeGreaterThanOrEqual(16);
  }
});

test("declares a safe-area viewport, theme color and branded icons", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /viewport-fit=cover/,
  );
  await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute(
    "content",
    /user-scalable=no|maximum-scale=1\b/,
  );
  // The login sits on the club's granate backdrop, so its browser chrome is granate.
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    LOGIN_THEME_COLOR,
  );
  await expect(
    page.locator('link[rel="icon"][type="image/svg+xml"]'),
  ).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});

test("signed-in screens color the browser chrome like the light app background", async ({
  page,
}) => {
  await login(page);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    APP_BACKGROUND_COLOR,
  );
});
