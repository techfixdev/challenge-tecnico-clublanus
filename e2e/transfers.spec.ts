import { expect, test, type Page } from "@playwright/test";

import { expectFitsEveryWidth } from "./fixtures/layout-audit";
import {
  primaryCardBalance,
  undoDemoTransfersSince,
} from "./fixtures/transfers-db";

const SENDER = { email: "soygranate@clublanus.com", password: "GRANATE1@" };
const RECIPIENT = { email: "hincha@clublanus.com", password: "GRANATE2@" };

/** Seed facts (prisma/seed.ts). */
const SEED = {
  senderAlias: "soy.granate.lanus",
  senderCvuGrouped: "0000 0031 1000 0000 0001 75",
};

function amountToCents(amount: string): number {
  const [units, fraction] = amount.split(".");
  return Number(units) * 100 + Number(fraction);
}

/** 96655 → "966.55" (as the card shows it, without grouping below 1,000). */
function centsToAmount(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

async function login(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

function primaryCard(page: Page) {
  return page.getByRole("region", {
    name: "Tarjeta Mastercard terminada en 1234",
  });
}

function latestMovements(page: Page) {
  return page
    .getByRole("region", { name: "Últimos movimientos" })
    .getByRole("listitem");
}

// These tests move the demo users' money, so they never run in parallel with each other
// (a balance asserted in one must not move under it). Each one undoes its own transfers
// afterwards and compares balances with what it read at its start, not with constants:
// a leftover from an interrupted run cannot make it fail.
test.describe.configure({ mode: "serial" });

let startedAt: Date;
let senderBalance: string;
test.beforeEach(async () => {
  startedAt = new Date(Date.now() - 1000);
  senderBalance = await primaryCardBalance(SENDER.email);
});
test.afterEach(async () => {
  await undoDemoTransfersSince(startedAt);
});

test("sends money to hincha.granate, who receives it", async ({
  page,
  browser,
}) => {
  await login(page, SENDER);
  await page
    .getByRole("navigation", { name: "Acciones rápidas" })
    .getByRole("link", { name: "Enviar" })
    .click();

  // Step 1: recipient.
  await expect(
    page.getByRole("heading", { name: "¿A quién le enviás?" }),
  ).toBeVisible();
  // The seeded transfer makes the other demo user a recent recipient.
  const recents = page.getByRole("region", { name: "Recientes" });
  await expect(recents).toContainText("Hincha Granate");
  await expect(recents).toContainText(/•••• \d{4}$/);
  await page.getByLabel("Alias o CVU").fill("hincha.granate");
  await page.getByRole("button", { name: "Continuar" }).click();

  // Step 2: amount (decimal comma), primary card preselected, optional reason.
  const amountHeading = page.getByRole("heading", {
    name: "¿Cuánto le enviás?",
  });
  await expect(amountHeading).toBeFocused();
  await expect(page.getByText("Hincha Granate")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Mastercard/ })).toBeChecked();
  await page.getByLabel("Monto en USD").fill("12,30");
  await page.getByLabel(/Motivo/).fill("Entradas e2e");
  // Left the field: the amount is written the app's way.
  await expect(page.getByLabel("Monto en USD")).toHaveValue("12.30");
  await page.getByRole("button", { name: "Continuar" }).click();

  // Step 3: review and confirm.
  await expect(
    page.getByRole("heading", { name: "Revisá la transferencia" }),
  ).toBeVisible();
  await expect(page.getByText("$12.30")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar y enviar" }).click();

  await expect(
    page.getByRole("heading", { name: "¡Transferencia enviada!" }),
  ).toBeVisible();
  await expect(
    page.getByText(/^ENV-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/),
  ).toBeVisible();
  await expectFitsEveryWidth(page, "transfer success");

  // The receipt is the SENT movement's detail.
  await page.getByRole("link", { name: "Ver comprobante" }).click();
  await expect(page).toHaveURL(/\/movimientos\/[^/]+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Hincha Granate" }),
  ).toBeVisible();
  await expect(page.getByText("Entradas e2e")).toBeVisible();

  // Home shows the new balance and the movement on top.
  await page.goto("/");
  await expect(primaryCard(page)).toContainText(
    centsToAmount(amountToCents(senderBalance) - 1230),
  );
  await expect(latestMovements(page).first()).toContainText("Hincha Granate");
  await expect(latestMovements(page).first()).toContainText("$12.30");

  // The recipient sees the money arrive.
  const recipientContext = await browser.newContext();
  const recipientPage = await recipientContext.newPage();
  await login(recipientPage, RECIPIENT);
  const received = latestMovements(recipientPage).first();
  await expect(received).toContainText("Granate Lanús");
  await expect(received).toContainText("Entradas e2e");
  await expect(received).toContainText("$12.30");
  await expect(received).toContainText("Recibido");
  await recipientContext.close();
});

test("refuses an amount above the balance, in Spanish, and moves nothing", async ({
  page,
}) => {
  await login(page, SENDER);
  await page.goto("/transferir");
  await page.getByLabel("Alias o CVU").fill("hincha.granate");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("Monto en USD").fill("5000");

  await expect(
    page.getByText("No tenés saldo suficiente en esta tarjeta"),
  ).toBeVisible();
  await expect(page.getByLabel("Monto en USD")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();

  await page.goto("/");
  await expect(primaryCard(page)).toContainText(senderBalance);
  expect(await primaryCardBalance(SENDER.email)).toBe(senderBalance);
});

test("explains an unknown alias without leaving the first step", async ({
  page,
}) => {
  await login(page, SENDER);
  await page.goto("/transferir");
  await page.getByLabel("Alias o CVU").fill("nadie.en.granabank");
  await page.getByRole("button", { name: "Continuar" }).click();

  // Scoped by text: Next's route announcer is a second role="alert" on the page.
  await expect(
    page.getByRole("alert").filter({ hasText: "No encontramos" }),
  ).toHaveText("No encontramos una cuenta con ese alias o CVU");
  await expect(
    page.getByRole("heading", { name: "¿A quién le enviás?" }),
  ).toBeVisible();
});

test.describe("receive", () => {
  test("shows the alias and CVU, and copies with the Clipboard API", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await login(page, SENDER);
    await page
      .getByRole("navigation", { name: "Acciones rápidas" })
      .getByRole("link", { name: "Recibir" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Recibir dinero" }),
    ).toBeVisible();
    await expect(page.getByText(SEED.senderAlias)).toBeVisible();
    await expect(page.getByText(SEED.senderCvuGrouped)).toBeVisible();

    await page.getByRole("button", { name: "Copiar CVU" }).click();
    await expect(
      page.getByRole("button", { name: "CVU copiado" }),
    ).toContainText("Copiado");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      SEED.senderCvuGrouped.replaceAll(" ", ""),
    );
  });

  test("copies without the Clipboard API too (plain http on the LAN)", async ({
    page,
  }) => {
    // What a phone sees on http://192.168.x.x:3000: not a secure context, no clipboard.
    await page.addInitScript(() => {
      Object.defineProperty(window, "isSecureContext", { value: false });
      Object.defineProperty(navigator, "clipboard", { value: undefined });
    });
    await login(page, SENDER);
    await page.goto("/recibir");

    await page.getByRole("button", { name: "Copiar alias" }).click();

    await expect(page.getByRole("status")).toHaveText("Alias copiado");
  });
});
