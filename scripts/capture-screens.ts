import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium, expect, type Page } from "@playwright/test";

import { waitForScreenToSettle } from "../e2e/fixtures/view-transitions";

/*
 * Captures every screen and state of the app as 390×844 @2x PNGs for Figma (README →
 * Figma), into design/screens/ (gitignored: regenerate them). Needs a running server:
 *
 *   pnpm db:test next start -p 3150                       # the test database, never dev
 *   BASE_URL=http://localhost:3150 pnpm screens:capture
 *
 * Read-only by default. The transfer success screen sends real money between the demo
 * users, so it is only captured with CAPTURE_ALLOW_MUTATION=1, meant for a server on the
 * test database (`pnpm db:test` re-seeds it); if DATABASE_URL is also set in this
 * process, it must name a `_test` database.
 */

const OUTPUT = path.join(process.cwd(), "design/screens");
const DEMO_USER = { email: "soygranate@clublanus.com", password: "GRANATE1@" };
const RECIPIENT_ALIAS = "hincha.granate";
const MASTERCARD = "Mastercard terminada en 1234";

/** Whether the run may submit a transfer. Throws if asked to on a non-test database. */
export function mutationAllowed(
  env: Partial<Record<string, string>> = process.env,
): boolean {
  if (env.CAPTURE_ALLOW_MUTATION !== "1") return false;
  if (env.DATABASE_URL) {
    const name = decodeURIComponent(
      new URL(env.DATABASE_URL).pathname.slice(1),
    );
    if (!name.endsWith("_test")) {
      throw new Error(
        `CAPTURE_ALLOW_MUTATION=1 refused: DATABASE_URL names "${name}", not a _test database`,
      );
    }
  }
  return true;
}

let captured = 0;

/** Waits for fonts, images and any running view transition, then takes the shot. */
async function shoot(page: Page, name: string) {
  // Not "networkidle": signed-in screens keep a connection open.
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    [...document.images].every((image) => image.complete),
  );
  await waitForScreenToSettle(page);
  // CSS and Web Animations that end (a crossfade, a reveal), not the looping shimmer.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => {
          const end = animation.effect?.getComputedTiming().endTime;
          return typeof end === "number" && Number.isFinite(end);
        })
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
  // Motion's JavaScript-driven frames (the card flip) are not Web Animations.
  await page.waitForTimeout(500);
  const file = path.join(
    OUTPUT,
    `${String(++captured).padStart(2, "0")}-${name}.png`,
  );
  await page.screenshot({ path: file });
  console.log(`  ${path.relative(process.cwd(), file)}`);
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_USER.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(DEMO_USER.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);
  // Home streams its cards in after the URL changes.
  await expect(
    page.getByRole("region", { name: `Tarjeta ${MASTERCARD}`, exact: true }),
  ).toBeVisible();
}

async function captureLogin(page: Page) {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
  await shoot(page, "login");

  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByText("Ingresá tu email")).toBeVisible();
  await shoot(page, "login-validation");

  await page.getByLabel("Email").fill(DEMO_USER.email);
  await page.getByLabel("Contraseña", { exact: true }).fill("incorrecta1");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Email o contraseña incorrectos" }),
  ).toBeVisible();
  await shoot(page, "login-error");
}

async function captureHome(page: Page) {
  await login(page);
  await shoot(page, "home");

  await page
    .getByRole("button", { name: `Mostrar datos de la tarjeta ${MASTERCARD}` })
    .first()
    .click();
  await expect(
    page
      .getByRole("region", { name: `Tarjeta ${MASTERCARD}`, exact: true })
      .getByTestId("card-number"),
  ).not.toContainText("•");
  await shoot(page, "home-card-revealed");

  await page
    .getByRole("button", { name: `Ver reverso de la tarjeta ${MASTERCARD}` })
    .click();
  await expect(
    page.getByRole("region", { name: `Reverso de la tarjeta ${MASTERCARD}` }),
  ).toBeVisible();
  await shoot(page, "home-card-back");
}

async function captureMovements(page: Page) {
  const rows = page
    .getByRole("region", { name: "Lista de movimientos" })
    .getByRole("listitem");

  await page.goto("/movimientos");
  await expect(rows.first()).toBeVisible();
  await shoot(page, "movements");

  await page
    .getByRole("navigation", { name: "Filtrar por tipo" })
    .getByRole("link", { name: "Recibido", exact: true })
    .click();
  await expect(page).toHaveURL(/type=recibido/);
  await expect(rows.first()).toBeVisible();
  await shoot(page, "movements-filtered");

  await page.goto("/movimientos?q=adobe");
  await expect(rows.first()).toContainText("Adobe");
  await shoot(page, "movements-search");

  await page.goto("/movimientos?q=zzzz");
  await expect(rows).toHaveCount(0);
  await shoot(page, "movements-search-empty");

  await page.goto("/movimientos");
  await rows.first().getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await shoot(page, "movement-detail");
}

async function captureTransfer(page: Page, allowMutation: boolean) {
  const proceed = page.getByRole("button", { name: "Continuar" });

  await page.goto("/transferir");
  await expect(
    page.getByRole("heading", { name: "¿A quién le enviás?" }),
  ).toBeVisible();
  await shoot(page, "transfer-1-recipient");

  await page.getByLabel("Alias o CVU").fill("nadie.en.granabank");
  await proceed.click();
  await expect(
    page.getByRole("alert").filter({ hasText: "No encontramos" }),
  ).toBeVisible();
  await shoot(page, "transfer-1-not-found");

  await page.getByLabel("Alias o CVU").fill(RECIPIENT_ALIAS);
  await proceed.click();
  await expect(
    page.getByRole("heading", { name: "¿Cuánto le enviás?" }),
  ).toBeVisible();
  await page.getByLabel("Monto en ARS").fill("1500");
  await page.getByLabel(/Motivo/).fill("Entradas");
  await shoot(page, "transfer-2-amount");

  await proceed.click();
  await expect(
    page.getByRole("heading", { name: "Revisá la transferencia" }),
  ).toBeVisible();
  await shoot(page, "transfer-3-review");

  if (!allowMutation) {
    console.log(
      "  (skipped transfer-success: set CAPTURE_ALLOW_MUTATION=1 against the test database)",
    );
    return;
  }
  await page.getByRole("button", { name: "Confirmar y enviar" }).click();
  await expect(
    page.getByRole("heading", { name: "¡Transferencia enviada!" }),
  ).toBeVisible();
  await shoot(page, "transfer-success");
}

async function captureReceive(page: Page) {
  await page.goto("/recibir");
  await expect(
    page.getByRole("heading", { name: "Recibir dinero" }),
  ).toBeVisible();
  await shoot(page, "receive");
}

async function captureProfile(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Tu perfil" }).click();
  const sheet = page.getByRole("dialog", { name: "Tu perfil" });
  await expect(sheet).toBeVisible();
  await shoot(page, "profile-sheet");

  await sheet.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(sheet).toContainText("¿Cerrar sesión?");
  await shoot(page, "profile-logout-confirm");
}

async function main() {
  const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
  const allowMutation = mutationAllowed();
  mkdirSync(OUTPUT, { recursive: true });
  console.log(
    `Capturing ${baseURL} into ${path.relative(process.cwd(), OUTPUT)}/`,
  );

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      // Still frames: no brand intro, no transitions half-way.
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await captureLogin(page);
    await captureHome(page);
    await captureMovements(page);
    await captureTransfer(page, allowMutation);
    await captureReceive(page);
    await captureProfile(page);
    console.log(`${captured} screens captured.`);
  } finally {
    await browser.close();
  }
}

// Run only as `pnpm screens:capture`, not when a test imports `mutationAllowed`.
if (process.argv[1]?.endsWith(path.join("scripts", "capture-screens.ts"))) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
