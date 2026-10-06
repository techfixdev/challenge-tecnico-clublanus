import { expect, test, type Page } from "@playwright/test";

import { expectFitsEveryWidth } from "./fixtures/layout-audit";

/*
 * Real phones reach narrow CSS viewports: 320px handsets, and Android's page zoom shrinks
 * the viewport well below that. Every screen must fit from 240px to desktop without
 * sideways scroll or cut text, and must not scroll sideways even at 180px. The payment
 * cards scale with their own width (container units), so nothing inside them may be
 * clipped or pushed out either.
 */

const CARD_WIDTHS = [240, 280, 320, 390, 768];

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("soygranate@clublanus.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("GRANATE1@");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

/**
 * Elements of each card that leave the card's content box (its padding excluded), plus
 * a clipped number line. The odometer strips are taller than their row on purpose (the
 * row clips them), and the screen-reader texts are visually hidden, so both are skipped.
 */
function cardOverflows(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("section[data-brand]")].flatMap(
      (card) => {
        const style = getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        // The carousel scales the cards that are not in front; padding scales with them.
        const scale = rect.width / card.offsetWidth;
        const box = {
          left: rect.left + parseFloat(style.paddingLeft) * scale,
          right: rect.right - parseFloat(style.paddingRight) * scale,
          top: rect.top + parseFloat(style.paddingTop) * scale,
          bottom: rect.bottom - parseFloat(style.paddingBottom) * scale,
        };
        const escaping = [...card.querySelectorAll("*")]
          .filter((element) => !element.closest("[data-digit], .sr-only"))
          .filter((element) => {
            const r = element.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            return (
              r.left < box.left - 0.5 ||
              r.right > box.right + 0.5 ||
              r.top < box.top - 0.5 ||
              r.bottom > box.bottom + 0.5
            );
          })
          .map(
            (element) =>
              `${card.dataset.brand}: <${element.tagName.toLowerCase()}> "${element.textContent?.trim() ?? ""}"`,
          );
        const number = card.querySelector<HTMLElement>(
          "[data-testid=card-number]",
        )!;
        if (number.scrollWidth > number.clientWidth) {
          escaping.push(`${card.dataset.brand}: clipped card number`);
        }
        return escaping;
      },
    ),
  );
}

test("the cards fit their content at every width and the page never scrolls sideways", async ({
  page,
}) => {
  await login(page);
  await page.evaluate(() => document.fonts.ready);

  for (const width of CARD_WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    await expect
      .poll(() => cardOverflows(page), { message: `cards at ${width}px` })
      .toEqual([]);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow at ${width}px`).toBe(0);
  }
});

test.describe("every screen fits every width", () => {
  test("login, with and without an error", async ({ page }) => {
    await page.goto("/login");
    await expectFitsEveryWidth(page, "login");

    await page.getByLabel("Email").fill("soygranate@clublanus.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("incorrecta1");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "incorrectos" }),
    ).toBeVisible();
    await expectFitsEveryWidth(page, "login error");
  });

  test.describe("signed in", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("home", async ({ page }) => {
      await expectFitsEveryWidth(page, "home");
    });

    test("movements, searched, filtered and empty", async ({ page }) => {
      await page.goto("/movimientos");
      await expectFitsEveryWidth(page, "movements");
      await page.goto("/movimientos?q=pago&type=recibido");
      await expect(page.getByRole("status")).toContainText("movimiento");
      await expectFitsEveryWidth(page, "movements searched and filtered");
      await page.goto("/movimientos?q=nada-coincide-con-esto");
      await expect(
        page.getByRole("heading", { name: /No encontramos/ }),
      ).toBeVisible();
      await expectFitsEveryWidth(page, "movements empty");
    });

    test("a movement detail and not found", async ({ page }) => {
      await page.goto("/movimientos");
      await page
        .getByRole("list", { name: "Lista de movimientos" })
        .getByRole("link")
        .first()
        .click();
      await expect(page).toHaveURL(/\/movimientos\/[^/]+$/);
      await expectFitsEveryWidth(page, "movement detail");
      await page.goto("/movimientos/no-existe");
      await expectFitsEveryWidth(page, "movement not found");
      await page.goto("/no-existe");
      await expectFitsEveryWidth(page, "page not found");
    });

    test("every step of a transfer, with its errors", async ({ page }) => {
      await page.goto("/transferir");
      await expectFitsEveryWidth(page, "transfer recipient");
      await page.getByLabel("Alias o CVU").fill("nadie.en.granabank");
      await page.getByRole("button", { name: "Continuar" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: "No encontramos" }),
      ).toBeVisible();
      await expectFitsEveryWidth(page, "transfer unknown recipient");

      await page.getByLabel("Alias o CVU").fill("hincha.granate");
      await page.getByRole("button", { name: "Continuar" }).click();
      await page.getByLabel("Monto en USD").fill("99999,99");
      await expect(
        page.getByText("No tenés saldo suficiente en esta tarjeta"),
      ).toBeVisible();
      await expectFitsEveryWidth(page, "transfer amount above the balance");

      await page.getByLabel("Monto en USD").fill("12,30");
      await page
        .getByLabel(/Motivo/)
        .fill("Entradas para el clásico del domingo en la Fortaleza");
      await page.getByRole("button", { name: "Continuar" }).click();
      await expect(
        page.getByRole("heading", { name: "Revisá la transferencia" }),
      ).toBeVisible();
      await expectFitsEveryWidth(page, "transfer review");
    });

    test("receive", async ({ page }) => {
      await page.goto("/recibir");
      await expectFitsEveryWidth(page, "receive");
    });
  });
});
