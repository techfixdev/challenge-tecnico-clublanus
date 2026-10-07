import type { Page } from "@playwright/test";

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
