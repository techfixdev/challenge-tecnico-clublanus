import { expect, test, type Page, type Response } from "@playwright/test";

import { movementRows, typeRecipient } from "./fixtures/screens";
import { loginUntilHomeSettles } from "./fixtures/session";

/*
 * The browser security headers (src/shared/security/headers.ts) and, above all, that the
 * app still works under its Content-Security-Policy: every violation the browser reports
 * while a user walks the main screens fails the spec.
 */

const STATIC_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "cross-origin-opener-policy": "same-origin",
};

function expectSecurityHeaders(response: Response | null) {
  expect(response, "the page answered").not.toBeNull();
  const headers = response!.headers();
  expect(headers).toMatchObject(STATIC_HEADERS);
  // No framework fingerprint (next.config.ts: poweredByHeader).
  expect(headers["x-powered-by"]).toBeUndefined();
  expect(headers["permissions-policy"]).toContain("camera=()");
  const policy = headers["content-security-policy"];
  expect(policy).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("object-src 'none'");
}

/**
 * Collects every CSP violation of the page: the `securitypolicyviolation` events (from an
 * init script, so it is listening before the first script of each document runs) and the
 * console errors Chrome prints for them.
 */
async function collectViolations(page: Page): Promise<string[]> {
  const violations: string[] = [];
  await page.exposeFunction("__reportCspViolation", (violation: string) => {
    violations.push(violation);
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      const report = (
        window as unknown as { __reportCspViolation: (v: string) => void }
      ).__reportCspViolation;
      void report(
        `${event.effectiveDirective} blocked ${event.blockedURI || "inline"} (${event.sourceFile}:${event.lineNumber})`,
      );
    });
  });
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) {
      violations.push(message.text());
    }
  });
  return violations;
}

test("/login sends the security headers", async ({ page }) => {
  expectSecurityHeaders(await page.goto("/login"));
});

test("the main screens run under the CSP without a single violation", async ({
  page,
}) => {
  const violations = await collectViolations(page);

  // Login, then Home with the brand intro, the cards and their reveal.
  await loginUntilHomeSettles(page);
  await page
    .getByRole("button", {
      name: "Mostrar datos de la tarjeta Mastercard terminada en 1234",
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Tarjeta Mastercard terminada en 1234" }),
  ).toContainText("978,85 dólares");

  // Movements: search (a client navigation), then a movement's detail.
  await page.getByRole("link", { name: "Buscar movimientos" }).click();
  const search = page.getByRole("searchbox", { name: "Buscar movimientos" });
  await search.fill("adobe");
  await expect(page).toHaveURL(/\/movimientos\?q=adobe$/);
  await expect(movementRows(page).first()).toContainText("Adobe");
  await movementRows(page).first().getByRole("link").click();
  await expect(page).toHaveURL(/\/movimientos\/c[a-z0-9]+/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Adobe");

  // A full load of a signed-in page carries the headers too.
  expectSecurityHeaders(await page.goto("/movimientos"));

  // Send flow, steps 1 and 2 (nothing is sent).
  await page.goto("/transferir");
  await expect(
    page.getByRole("heading", { name: "¿A quién le enviás?" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Recientes" })
      .getByRole("option", { name: /Hincha Granate/ }),
  ).toBeVisible();
  await typeRecipient(page, "hincha.granate");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByRole("heading", { name: "¿Cuánto le enviás?" }),
  ).toBeVisible();

  // Receive: the QR drawn as inline SVG.
  await page.goto("/recibir");
  await expect(
    page.getByRole("heading", { name: "Recibir dinero" }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: /Código QR/ })).toBeVisible();

  expect(violations).toEqual([]);
});
