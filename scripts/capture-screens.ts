import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium, expect, type Page } from "@playwright/test";

import {
  movementRows,
  primaryCard,
  recipientSearch,
} from "../e2e/fixtures/screens";
import { DEMO_USER, login } from "../e2e/fixtures/session";
import { waitForScreenToSettle } from "../e2e/fixtures/view-transitions";

/*
 * Captures every screen and state of the app as 390×844 @2x PNGs for Figma (README →
 * Figma), into design/screens/ (gitignored: regenerate them). Needs a running server:
 *
 *   pnpm db:test next start -p 3150                       # the test database, never dev
 *   BASE_URL=http://localhost:3150 pnpm screens:capture
 *
 * Read-only by default: every capture only navigates and fills forms, except one. The
 * transfer success screen sends real money between the demo users, so that step runs only
 * with CAPTURE_ALLOW_MUTATION=1 (see `main`), meant for a server on the test database
 * (`pnpm db:test` re-seeds it); if DATABASE_URL is also set in this process, it must name
 * a `_test` database.
 */

const OUTPUT = path.join(process.cwd(), "design/screens");
const RECIPIENT_ALIAS = "hincha.granate";
const MASTERCARD = "Mastercard terminada en 1234";

/** Frames the inline styles must hold still to count as settled, and how long to wait. */
const STILL_FRAMES = 5;
const SETTLE_TIMEOUT_MS = 5_000;

/**
 * Whether the run may write data (submit a transfer): the one gate for every mutating
 * step. Throws if asked to on a non-test database.
 */
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

/**
 * Waits until every image on screen is loaded and decoded, ready to paint: `decode()`
 * promises both, `complete` does not (an image can be complete and still undecoded). A
 * broken image rejects and is shot as it is.
 */
async function waitForImagesOnScreen(page: Page) {
  await page.evaluate(async () => {
    const onScreen = [...document.images].filter((image) => {
      const box = image.getBoundingClientRect();
      return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight;
    });
    await Promise.all(
      onScreen.map((image) => image.decode().catch(() => undefined)),
    );
  });
}

/** Waits for the CSS and Web Animations that end (a crossfade, a reveal), not the shimmer. */
async function waitForFiniteAnimations(page: Page) {
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
}

/**
 * Waits until the inline styles hold still for a few frames. Motion drives some motion
 * (the card flip, springs) from JavaScript, writing inline styles every frame, and those
 * are not Web Animations: `getAnimations()` never sees them.
 */
async function waitForInlineStylesToSettle(page: Page) {
  // No named helpers inside the page function: tsx compiles them with a `__name` wrapper
  // that only exists in Node, and the function runs in the page.
  const settled = await page.evaluate(
    async ({ stillFrames, timeoutMs }) => {
      const deadline = performance.now() + timeoutMs;
      let previous = "";
      for (let still = 0; still < stillFrames;) {
        if (performance.now() > deadline) return false;
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const current = [...document.querySelectorAll<HTMLElement>("[style]")]
          .map((element) => element.style.cssText)
          .join("\n");
        still = current === previous ? still + 1 : 0;
        previous = current;
      }
      return true;
    },
    { stillFrames: STILL_FRAMES, timeoutMs: SETTLE_TIMEOUT_MS },
  );
  if (!settled) {
    console.warn("  (inline styles kept changing: shooting anyway)");
  }
}

/** Waits for fonts, images and every animation to finish, then takes the shot. */
async function shoot(page: Page, name: string) {
  // Not "networkidle": signed-in screens keep a connection open.
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts.ready);
  await waitForImagesOnScreen(page);
  await waitForScreenToSettle(page);
  await waitForFiniteAnimations(page);
  await waitForInlineStylesToSettle(page);
  const file = path.join(
    OUTPUT,
    `${String(++captured).padStart(2, "0")}-${name}.png`,
  );
  await page.screenshot({ path: file });
  console.log(`  ${path.relative(process.cwd(), file)}`);
}

/** Signs in as the demo user and waits for Home's cards, which stream in after the URL. */
async function loginUntilCardsShow(page: Page) {
  await login(page);
  await expect(primaryCard(page)).toBeVisible();
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
  await loginUntilCardsShow(page);
  await shoot(page, "home");

  await page
    .getByRole("button", { name: `Mostrar datos de la tarjeta ${MASTERCARD}` })
    .first()
    .click();
  await expect(primaryCard(page).getByTestId("card-number")).not.toContainText(
    "•",
  );
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
  const rows = movementRows(page);

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

/** The send flow up to its review screen; nothing is sent. */
async function captureTransferSteps(page: Page) {
  const proceed = page.getByRole("button", { name: "Continuar" });

  await page.goto("/transferir");
  await expect(
    page.getByRole("heading", { name: "¿A quién le enviás?" }),
  ).toBeVisible();
  await shoot(page, "transfer-1-recipient");

  // The search narrows the recents strip as it is typed.
  await recipientSearch(page).fill("valen");
  await expect(
    page.getByRole("option", { name: /Valentina Sosa/ }),
  ).toBeVisible();
  await shoot(page, "transfer-1-search");

  // An alias no recent has: the search offers to look it up (not done here).
  await recipientSearch(page).fill("nadie.en.granabank");
  await expect(
    page.getByRole("button", { name: /Buscar «nadie\.en\.granabank»/ }),
  ).toBeVisible();
  await shoot(page, "transfer-1-lookup");

  await proceed.click();
  await expect(
    page.getByRole("alert").filter({ hasText: "No encontramos" }),
  ).toBeVisible();
  await shoot(page, "transfer-1-not-found");

  await recipientSearch(page).fill(RECIPIENT_ALIAS);
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
}

/** MUTATES: confirms the reviewed transfer, moving real money between the demo users. */
async function captureTransferSent(page: Page) {
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
    await captureTransferSteps(page);
    // The only step that writes data, behind the one gate (`mutationAllowed`).
    if (allowMutation) {
      await captureTransferSent(page);
    } else {
      console.log(
        "  (skipped transfer-success: set CAPTURE_ALLOW_MUTATION=1 against the test database)",
      );
    }
    await captureReceive(page);
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
