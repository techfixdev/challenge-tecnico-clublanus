import { expect, test, type Locator, type Page } from "@playwright/test";

import { movementRows } from "./fixtures/screens";
import { login } from "./fixtures/session";
import { settle } from "./fixtures/view-transitions";

/*
 * Gestures that move surfaces with the finger: the edge swipe back on pushed screens
 * (shared/ui/gestures/EdgeSwipeBack.tsx) and dragging a sheet down to dismiss it
 * (shared/ui/Sheet.tsx). Driven with the mouse (pointer events, like a finger); a
 * pause before lifting makes a release slow, so the distance decides it, not a flick.
 */

const VIEWPORT_WIDTH = 390;
const ROW_Y = 420;

/** Longer than the velocity estimate's window: a release after it carries no speed. */
const REST_BEFORE_LIFT_MS = 150;

async function openFirstDetail(page: Page) {
  await page.goto("/movimientos");
  await movementRows(page).first().getByRole("link").click();
  await expect(page).toHaveURL(/\/movimientos\/.+/);
  await expect(page.getByRole("link", { name: "Volver" })).toBeVisible();
  // Interactive (hydrated, nothing still streaming) and no push still sliding.
  await settle(page);
}

function swipedScreen(page: Page) {
  return page.getByTestId("edge-swipe-screen");
}

/** The screen's horizontal offset, from its inline transform (0 at rest). */
async function screenOffset(screen: Locator) {
  return screen.evaluate((element) => {
    const { transform } = (element as HTMLElement).style;
    return transform ? new DOMMatrix(transform).m41 : 0;
  });
}

/** Presses at `fromX` and drags horizontally to `toX` in small steps, still pressed. */
async function dragFromX(page: Page, fromX: number, toX: number, y = ROW_Y) {
  await page.mouse.move(fromX, y);
  await page.mouse.down();
  await page.mouse.move(toX, y, { steps: 12 });
}

async function liftSlowly(page: Page) {
  await page.waitForTimeout(REST_BEFORE_LIFT_MS);
  await page.mouse.up();
}

test.describe("edge swipe back", () => {
  test.use({ reducedMotion: "no-preference" });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("the screen follows the finger from the left edge, over a shade that lightens", async ({
    page,
  }) => {
    await openFirstDetail(page);
    await dragFromX(page, 4, 154);

    // 1:1 with the finger: it moved 150px from where it pressed.
    expect(await screenOffset(swipedScreen(page))).toBeCloseTo(150, 0);
    const shade = Number(
      await page
        .getByTestId("edge-swipe-shade")
        .evaluate((element) => getComputedStyle(element).opacity),
    );
    expect(shade).toBeGreaterThan(0);
    expect(shade).toBeLessThan(0.08);

    await liftSlowly(page);
  });

  test("released past the threshold, it goes back to the list", async ({
    page,
  }) => {
    await openFirstDetail(page);
    await dragFromX(page, 4, VIEWPORT_WIDTH * 0.6);
    await liftSlowly(page);

    await expect(page).toHaveURL(/\/movimientos$/);
    await expect(movementRows(page).first()).toBeVisible();
  });

  test("a quick flick goes back, however short", async ({ page }) => {
    await openFirstDetail(page);
    await page.mouse.move(4, ROW_Y);
    await page.mouse.down();
    await page.mouse.move(80, ROW_Y, { steps: 4 });
    await page.mouse.up();

    await expect(page).toHaveURL(/\/movimientos$/);
  });

  test("released short of it, slowly, it springs back and stays", async ({
    page,
  }) => {
    await openFirstDetail(page);
    const url = page.url();
    await dragFromX(page, 4, 84);
    await liftSlowly(page);

    await expect.poll(() => screenOffset(swipedScreen(page))).toBe(0);
    expect(page.url()).toBe(url);
  });

  test("only a press at the edge, moving sideways, starts it", async ({
    page,
  }) => {
    await openFirstDetail(page);
    const screen = swipedScreen(page);

    // Away from the edge: content, not a swipe.
    await dragFromX(page, 120, 300);
    expect(await screenOffset(screen)).toBe(0);
    await page.mouse.up();

    // At the edge but vertical: the page's scroll axis, never the swipe's.
    await page.mouse.move(4, ROW_Y);
    await page.mouse.down();
    await page.mouse.move(14, ROW_Y + 160, { steps: 12 });
    await page.mouse.move(200, ROW_Y + 160, { steps: 12 });
    expect(await screenOffset(screen)).toBe(0);
    await page.mouse.up();
  });

  test("on Recibir it goes back Home, like its chevron", async ({ page }) => {
    await page.goto("/recibir");
    await expect(
      page.getByRole("heading", { name: "Recibir dinero" }),
    ).toBeVisible();
    await settle(page);
    await dragFromX(page, 4, VIEWPORT_WIDTH * 0.6);
    await liftSlowly(page);

    await expect(page).toHaveURL(/\/$/);
  });

  test("the chevron still goes back", async ({ page }) => {
    await openFirstDetail(page);
    await page.getByRole("link", { name: "Volver" }).click();
    await expect(page).toHaveURL(/\/movimientos$/);
  });
});

test.describe("edge swipe back, reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("a completed swipe still goes back", async ({ page }) => {
    await login(page);
    await openFirstDetail(page);
    await dragFromX(page, 4, VIEWPORT_WIDTH * 0.6);
    await liftSlowly(page);

    await expect(page).toHaveURL(/\/movimientos$/);
  });
});

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
