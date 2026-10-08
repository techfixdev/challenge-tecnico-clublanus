import { expect, type Page } from "@playwright/test";

import { resetRateLimitsFor } from "./rate-limits";
import { waitForScreenToSettle } from "./view-transitions";

/*
 * The seeded demo accounts (prisma/seed.ts) and the login every signed-in spec starts
 * from, so each spec reads as its own scenario instead of repeating the form steps.
 */

export type Credentials = { email: string; password: string };

/** The main demo user, the one the README hands to reviewers. */
export const DEMO_USER: Credentials = {
  email: "soygranate@clublanus.com",
  password: "GRANATE1@",
};

/** The second seeded user, so transfers and per-user data can be checked both ways. */
export const SECOND_USER: Credentials = {
  email: "hincha@clublanus.com",
  password: "GRANATE2@",
};

/**
 * Opens /login and fills it in for `user`, without submitting it. Every scenario that
 * signs in starts with empty rate-limit counters for that user (fixtures/rate-limits.ts).
 */
export async function fillLoginForm(page: Page, user = DEMO_USER) {
  await resetRateLimitsFor(user.email);
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(user.password);
}

/**
 * Signs in through the login form and waits for Home's URL. Home's content may still be
 * streaming in at that point: specs that touch it wait for what they need.
 */
export async function login(page: Page, user = DEMO_USER) {
  await fillLoginForm(page, user);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

/**
 * Waits until Home can be touched like a user would: its cards have streamed in and
 * dissolved in (a tap made before they are there, or while that transition runs, never
 * reaches them), the deck has hydrated and measured its cards, and HomeEntrance has built
 * the screen, so the cards rest where they will stay.
 */
export async function waitForHomeToSettle(page: Page) {
  await waitForScreenToSettle(page);
  await expect(
    page.getByRole("list", { name: "Tus tarjetas" }),
  ).toHaveAttribute("data-measured");
  await expect(page.locator("html")).toHaveAttribute("data-home-entered");
}

/** Signs in and waits until Home can be touched (see `waitForHomeToSettle`). */
export async function loginUntilHomeSettles(page: Page, user = DEMO_USER) {
  await login(page, user);
  await waitForHomeToSettle(page);
}
