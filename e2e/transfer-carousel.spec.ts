import { expect, test, type Locator, type Page } from "@playwright/test";

import { login } from "./fixtures/session";

/*
 * The send flow is one surface moved by the finger: recents are a strip of tiles dragged
 * sideways, the amount comes from the flow's own keypad, and the steps rearrange in place.
 * Nothing here confirms a transfer (read-only for the shared test database). The seed
 * gives the demo user one recent recipient (the other demo user), so the drag checked
 * here is the strip's edge: it stretches under the finger and settles back.
 */

async function centerX(target: Locator): Promise<number> {
  const box = await target.boundingBox();
  expect(box, "the element has a box").not.toBeNull();
  return box ? box.x + box.width / 2 : 0;
}

/** Drags from the middle of `target` by `dx` pixels in small steps, finger still down. */
async function dragBy(page: Page, target: Locator, dx: number) {
  const box = await target.boundingBox();
  if (!box) throw new Error("nothing to drag");
  const startX = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + dx, y, { steps: 12 });
}

test.describe("the transfer flow, by hand", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/transferir");
  });

  test("the recents strip stretches past its end and settles back", async ({
    page,
  }) => {
    const strip = page.getByRole("listbox", { name: "Recientes" });
    const tile = strip.getByRole("option", { name: /Hincha Granate/ });
    await expect(tile).toBeVisible();
    const rest = await centerX(tile);

    await dragBy(page, tile, -150);
    // Past the strip's end the tile follows the finger, but resisting it.
    const pulled = rest - (await centerX(tile));
    expect(pulled).toBeGreaterThan(10);
    expect(pulled).toBeLessThan(150);

    await page.mouse.up();
    await expect.poll(() => centerX(tile)).toBeCloseTo(rest, 0);
    // Settling on the tile chose them: the field holds their alias.
    await expect(tile).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Alias o CVU")).toHaveValue("hincha.granate");
    // A drag is not a tap: the flow is still on the first step.
    await expect(
      page.getByRole("heading", { level: 1, name: "¿A quién le enviás?" }),
    ).toBeVisible();
  });

  test("rearranges in place from recipient to amount to review, and back", async ({
    page,
  }) => {
    const heading = page.getByRole("heading", { level: 1 });
    await page.getByRole("option", { name: /Hincha Granate/ }).click();

    // The amount: the recipient in the header row, the keypad risen from the bottom.
    await expect(heading).toHaveText("¿Cuánto le enviás?");
    const keypad = page.getByRole("group", { name: "Teclado numérico" });
    await expect(keypad).toBeVisible();
    await expect(page.getByRole("listbox", { name: "Recientes" })).toHaveCount(
      0,
    );
    for (const key of ["1", "5", "0", "0", "Coma decimal", "5"]) {
      await keypad.getByRole("button", { name: key, exact: true }).click();
    }
    const amount = page.getByLabel("Monto en ARS");
    await expect(amount).toHaveValue("1.500,5");
    // Keys are thumb-sized.
    const key = await keypad.getByRole("button", { name: "5" }).boundingBox();
    expect(key?.height).toBeGreaterThanOrEqual(44);
    expect(key?.width).toBeGreaterThanOrEqual(44);

    // The review: the keypad folds away, the same button now confirms.
    const proceed = page.getByRole("button", { name: "Continuar" });
    await proceed.click();
    await expect(heading).toHaveText("Revisá la transferencia");
    await expect(keypad).toHaveCount(0);
    await expect(page.getByText("$ 1.500,50")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar y enviar" }),
    ).toBeVisible();

    // Back: the keypad rises again with the amount kept, then the strip returns.
    await page.getByRole("button", { name: "Volver" }).click();
    await expect(heading).toHaveText("¿Cuánto le enviás?");
    await expect(keypad).toBeVisible();
    await expect(amount).toHaveValue("1.500,50");
    await page.getByRole("button", { name: "Volver" }).click();
    await expect(heading).toHaveText("¿A quién le enviás?");
    await expect(
      page.getByRole("option", { name: /Hincha Granate/ }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("works by keyboard: the strip's arrows and Enter, then typed digits", async ({
    page,
  }) => {
    const strip = page.getByRole("listbox", { name: "Recientes" });
    await strip.focus();
    await page.keyboard.press("End");
    await expect(page.getByLabel("Alias o CVU")).toHaveValue("hincha.granate");
    await page.keyboard.press("Enter");

    const heading = page.getByRole("heading", {
      level: 1,
      name: "¿Cuánto le enviás?",
    });
    await expect(heading).toBeFocused();
    await page.keyboard.type("2500");
    await expect(page.getByLabel("Monto en ARS")).toHaveValue("2.500");
    await page.keyboard.press("Backspace");
    await expect(page.getByLabel("Monto en ARS")).toHaveValue("250");
  });

  test("under reduced motion, the steps swap at once and still work", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await page.getByRole("option", { name: /Hincha Granate/ }).click();
    const keypad = page.getByRole("group", { name: "Teclado numérico" });
    await expect(keypad).toBeVisible();
    await keypad.getByRole("button", { name: "9", exact: true }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Revisá la transferencia" }),
    ).toBeVisible();
    await expect(keypad).toHaveCount(0);
  });
});
