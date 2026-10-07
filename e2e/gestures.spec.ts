import { expect, test, type Locator, type Page } from "@playwright/test";

import { login } from "./fixtures/session";
import { settle } from "./fixtures/view-transitions";

/*
 * Gestures that move surfaces with the finger: dragging a sheet down to dismiss it
 * (shared/ui/Sheet.tsx). Driven with the mouse (pointer events, like a finger); a
 * pause before lifting makes a release slow, so the distance decides it, not a flick.
 */

/** Longer than the velocity estimate's window: a release after it carries no speed. */
const REST_BEFORE_LIFT_MS = 150;

async function liftSlowly(page: Page) {
  await page.waitForTimeout(REST_BEFORE_LIFT_MS);
  await page.mouse.up();
}

async function openProfileSheet(page: Page) {
  await settle(page);
  await page.getByRole("button", { name: "Tu perfil" }).click();
  const sheet = page.getByRole("dialog", { name: "Tu perfil" });
  await expect(sheet).toBeVisible();
  // Risen all the way (the opening slide has finished).
  await expect
    .poll(() =>
      sheet.evaluate((element) => element.getBoundingClientRect().bottom),
    )
    .toBeCloseTo(844, 0);
  return sheet;
}

/** Presses on the sheet's grab handle and drags vertically by `dy`, still pressed. */
async function dragSheet(page: Page, sheet: Locator, dy: number) {
  const box = (await sheet.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + 12;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps: 12 });
}

/** The sheet's vertical drag offset, from its inline transform (0 at rest). */
async function sheetOffset(sheet: Locator) {
  return sheet.evaluate((element) => {
    const { transform } = (element as HTMLElement).style;
    return transform ? new DOMMatrix(transform).m42 : 0;
  });
}

test.describe("drag a sheet to dismiss it", () => {
  test.use({ reducedMotion: "no-preference" });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("it follows the finger down while the page behind lightens", async ({
    page,
  }) => {
    const sheet = await openProfileSheet(page);
    await dragSheet(page, sheet, 60);

    expect(await sheetOffset(sheet)).toBeCloseTo(60, 0);
    const progress = Number(
      await sheet.evaluate((element) =>
        (element as HTMLElement).style.getPropertyValue(
          "--sheet-drag-progress",
        ),
      ),
    );
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1);
    await liftSlowly(page);
  });

  test("pulled up, it resists", async ({ page }) => {
    const sheet = await openProfileSheet(page);
    await dragSheet(page, sheet, -80);

    const offset = await sheetOffset(sheet);
    expect(offset).toBeLessThan(0);
    expect(offset).toBeGreaterThan(-80);
    await liftSlowly(page);
    await expect.poll(() => sheetOffset(sheet)).toBe(0);
  });

  test("released short, it settles back open", async ({ page }) => {
    const sheet = await openProfileSheet(page);
    await dragSheet(page, sheet, 40);
    await liftSlowly(page);

    await expect.poll(() => sheetOffset(sheet)).toBe(0);
    await expect(sheet).toBeVisible();
  });

  test("released far enough down, it closes and the focus returns to its trigger", async ({
    page,
  }) => {
    const sheet = await openProfileSheet(page);
    const height = (await sheet.boundingBox())!.height;
    await dragSheet(page, sheet, height * 0.6);
    await liftSlowly(page);

    await expect(sheet).toBeHidden();
    await expect(page.getByRole("button", { name: "Tu perfil" })).toBeFocused();
  });

  test("dragging from a button never presses it", async ({ page }) => {
    const sheet = await openProfileSheet(page);
    const logout = sheet.getByRole("button", { name: "Cerrar sesión" });
    const box = (await logout.boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 20, box.y + box.height / 2 + 30, {
      steps: 8,
    });
    await liftSlowly(page);

    await expect.poll(() => sheetOffset(sheet)).toBe(0);
    await expect(sheet.getByText("¿Cerrar sesión?")).toHaveCount(0);
  });

  test("Escape still closes it", async ({ page }) => {
    const sheet = await openProfileSheet(page);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });
});
