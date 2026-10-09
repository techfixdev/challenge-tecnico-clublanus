import { expect, type Page } from "@playwright/test";

/*
 * Locators for the screens several specs share, by role and accessible name (what a
 * screen reader announces), never by markup.
 */

/** The rows of the Movements list (one per movement, across its day groups). */
export function movementRows(page: Page) {
  return page
    .getByRole("region", { name: "Lista de movimientos" })
    .getByRole("listitem");
}

/** The demo user's primary card on Home (its front face). */
export function primaryCard(page: Page) {
  return page.getByRole("region", {
    name: "Tarjeta Mastercard terminada en 1234",
    exact: true,
  });
}

/** The send flow's one search field (step 1): a combobox over the recents carousel. */
export function recipientSearch(page: Page) {
  return page.getByRole("combobox", { name: "Buscar por nombre, alias o CVU" });
}

/**
 * Types `text` into the send flow's search until the screen has taken it: right after
 * `page.goto`, text typed before React hydrates the field may not reach its state, which
 * leaves "Continuar" disabled. Retyping until the button enables waits for hydration
 * without a fixed sleep (test-only; the app itself is not changed for it).
 */
export async function typeRecipient(page: Page, text: string): Promise<void> {
  const proceed = page.getByRole("button", { name: "Continuar" });
  await expect(async () => {
    await recipientSearch(page).fill("");
    await recipientSearch(page).fill(text);
    await expect(recipientSearch(page)).toHaveValue(text, { timeout: 1_000 });
    await expect(proceed).toBeEnabled({ timeout: 1_000 });
  }).toPass();
}

/**
 * Brings Home's card number `position` (of `count`) forward with its dot, as a user does
 * before touching anything on it, and waits until the deck rests there. A card further
 * along is off-screen: tapping its controls directly would make the browser scroll the
 * deck, which then glides onto the card under the tap.
 */
export async function bringCardForward(
  page: Page,
  position: number,
  count: number,
) {
  const dot = page.getByRole("button", {
    name: `Tarjeta ${position} de ${count}`,
  });
  await dot.click();
  await expect(dot).toHaveAttribute("aria-current", "true");
  const deck = page.getByRole("list", { name: "Tus tarjetas" });
  await expect
    .poll(
      async () => {
        const before = await deck.evaluate((list) => list.scrollLeft);
        await page.waitForTimeout(50);
        return (await deck.evaluate((list) => list.scrollLeft)) === before;
      },
      { message: "the deck rests on the card" },
    )
    .toBe(true);
}
