import { expect, type Page } from "@playwright/test";

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

/** Opens /login and fills it in for `user`, without submitting it. */
export async function fillLoginForm(page: Page, user = DEMO_USER) {
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
