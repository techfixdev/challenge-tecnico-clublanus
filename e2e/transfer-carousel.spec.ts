import { expect, test, type Locator, type Page } from "@playwright/test";

import { login } from "./fixtures/session";
import { settle } from "./fixtures/view-transitions";

/*
 * The send flow is one surface moved by the finger: recents are a strip of tiles dragged
 * sideways, the amount comes from the flow's own keypad, and the steps rearrange in place.
 * Nothing here confirms a transfer (read-only for the shared test database). The seed
 * gives the demo user six recent recipients, newest first: the other demo user, then
 * Valentina Sosa, Matías Herrera, Camila Benítez, Nicolás Acosta and Florencia Ríos.
 */

/** The recipient step's one search field. */
const SEARCH = "Buscar por nombre, alias o CVU";

async function centerX(target: Locator): Promise<number> {
  const box = await target.boundingBox();
  expect(box, "the element has a box").not.toBeNull();
  return box ? box.x + box.width / 2 : 0;
}

/**
 * Drags from the middle of `target` by `dx` pixels in small steps, finger still down.
 * Returns where the finger is.
 */
async function dragBy(page: Page, target: Locator, dx: number) {
  const box = await target.boundingBox();
  if (!box) throw new Error("nothing to drag");
  const startX = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + dx, y, { steps: 12 });
  return { x: startX + dx, y };
}

/** Distance between two neighboring tiles' centers, measured on the strip at rest. */
async function tileStep(strip: Locator): Promise<number> {
  const tiles = strip.getByRole("option");
  return (await centerX(tiles.nth(1))) - (await centerX(tiles.nth(0)));
}

/**
 * Keeps the finger where it is for longer than the release velocity's window (moving
 * only a pixel up and down), so lifting it then throws nothing: the strip settles on
 * the tile nearest to where it was let go. The hold is real time on purpose: Motion
 * measures a pan's velocity with its own clock, not the events' timestamps, so only
 * letting time pass zeroes it. A slower machine only holds longer, which throws less.
 */
async function holdStill(page: Page, finger: { x: number; y: number }) {
  for (let sample = 0; sample < 8; sample += 1) {
    await page.mouse.move(finger.x, finger.y + (sample % 2));
    await page.waitForTimeout(20);
  }
}

test.describe("the transfer flow, by hand", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/transferir");
    // The strip takes drags once Motion's gesture features have loaded (after hydration).
    await settle(page);
  });

  test("the recents strip stretches past its start and settles back", async ({
    page,
  }) => {
    const strip = page.getByRole("listbox", { name: "Recientes" });
    const tile = strip.getByRole("option", { name: /Hincha Granate/ });
    await expect(tile).toBeVisible();
    const rest = await centerX(tile);

    await dragBy(page, tile, 150);
    // Before the first tile the strip follows the finger, but resisting it.
    const pulled = (await centerX(tile)) - rest;
    expect(pulled).toBeGreaterThan(10);
    expect(pulled).toBeLessThan(150);

    await page.mouse.up();
    await expect.poll(() => centerX(tile)).toBeCloseTo(rest, 0);
    // Settling on the tile chose them; the search above keeps what was typed (nothing).
    await expect(tile).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("combobox", { name: SEARCH })).toHaveValue("");
    // A drag is not a tap: the flow is still on the first step.
    await expect(
      page.getByRole("heading", { level: 1, name: "¿A quién le enviás?" }),
    ).toBeVisible();
  });

  test("dragging the strip scrubs through the recents, one tile per step", async ({
    page,
  }) => {
    const strip = page.getByRole("listbox", { name: "Recientes" });
    const first = strip.getByRole("option", { name: /Hincha Granate/ });
    const third = strip.getByRole("option", { name: /Matías Herrera/ });
    await expect(first).toBeVisible();
    const center = await centerX(first);
    const step = await tileStep(strip);

    // Two tiles' worth to the left, held still (no flick), then let go.
    await holdStill(page, await dragBy(page, first, -2 * step));
    await page.mouse.up();

    // The third person settles in the center and is the one chosen.
    await expect.poll(() => centerX(third)).toBeCloseTo(center, 0);
    await expect(third).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  test("the search narrows the strip as it is typed, centering the first match", async ({
    page,
  }) => {
    const strip = page.getByRole("listbox", { name: "Recientes" });
    const first = strip.getByRole("option").first();
    await expect(first).toBeVisible();
    const center = await centerX(first);
    const search = page.getByRole("combobox", { name: SEARCH });

    // Case and accents do not count.
    await search.fill("MATIAS");
    const matias = strip.getByRole("option", { name: /Matías Herrera/ });
    await expect(strip.getByRole("option")).toHaveCount(1);
    await expect(matias).toHaveAttribute("aria-selected", "true");
    await expect.poll(() => centerX(matias)).toBeCloseTo(center, 0);

    // Several matches keep the recents' order; the first one is chosen.
    await search.fill("granate");
    await expect(strip.getByRole("option")).not.toHaveCount(1);
    await expect(strip.getByRole("option").first()).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await search.fill("zzzzzz");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(
      page.getByText("Sin coincidencias en tus recientes", { exact: true }),
    ).toHaveCount(2);

    // The clear button brings every recent back.
    await page.getByRole("button", { name: "Borrar búsqueda" }).click();
    await expect(search).toHaveValue("");
    await expect(search).toBeFocused();
    await expect(strip.getByRole("option")).toHaveCount(6);
  });

  test("a ?to= link fills the search and centers that recent when going back", async ({
    page,
  }) => {
    await page.goto("/transferir?to=mati.granate");
    await expect(
      page.getByRole("heading", { level: 1, name: "¿Cuánto le enviás?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cambiar" }).click();

    await expect(page.getByRole("combobox", { name: SEARCH })).toHaveValue(
      "mati.granate",
    );
    const matias = page.getByRole("option", { name: /Matías Herrera/ });
    await expect(matias).toHaveAttribute("aria-selected", "true");
    await expect(matias).toBeInViewport();
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

  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`goes on straight from the reason field (${reducedMotion} motion)`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion });
      await page.reload();
      await page.getByRole("option", { name: /Hincha Granate/ }).click();
      const keypad = page.getByRole("group", { name: "Teclado numérico" });
      await keypad.getByRole("button", { name: "7", exact: true }).click();

      // Typing the reason hands the screen to the phone's keyboard: the keypad folds.
      const reason = page.getByLabel(/Motivo/);
      await reason.fill("Entradas");
      await expect(keypad).toHaveCount(0);

      // Pressing "Continuar" from there blurs the field first, which brings the keypad
      // back between press and release. It rises above the button, which is pinned to
      // the bottom, so the button stays where the pointer went down.
      const proceed = page.getByRole("button", { name: "Continuar" });
      const pressedAt = await proceed.boundingBox();
      await reason.blur();
      await expect(keypad).toBeVisible();
      await expect
        .poll(async () => (await proceed.boundingBox())?.y)
        .toBeCloseTo(pressedAt?.y ?? Number.NaN, 0);

      await reason.focus();
      await expect(keypad).toHaveCount(0);
      await proceed.click();
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Revisá la transferencia",
        }),
      ).toBeVisible();
      await expect(page.getByText("Entradas")).toBeVisible();
    });
  }

  test("works by keyboard: the strip's arrows and Enter, then typed digits", async ({
    page,
  }) => {
    const strip = page.getByRole("listbox", { name: "Recientes" });
    await strip.focus();
    await page.keyboard.press("End");
    await expect(
      strip.getByRole("option", { name: /Florencia Ríos/ }),
    ).toHaveAttribute("aria-selected", "true");
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
