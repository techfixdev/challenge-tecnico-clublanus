import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("soygranate@clublanus.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("GRANATE1@");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

function primaryCard(page: Page) {
  return page.getByRole("region", {
    name: "Tarjeta Mastercard terminada en 1234",
  });
}

test("hides every balance, and the choice survives a reload", async ({
  page,
}) => {
  await login(page);
  const toggle = page.getByRole("button", { name: "Ocultar saldo" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(primaryCard(page)).toContainText("978.85");

  await toggle.click();

  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  const cards = page.getByRole("list", { name: "Tus tarjetas" });
  await expect(cards.getByText("••••••")).toHaveCount(2);
  await expect(cards).not.toContainText("978.85");

  // The server renders the choice (cookie): the HTML already carries the mask and no
  // rendered balance, so a hidden balance never flashes before hydration.
  const html = await (await page.request.get("/")).text();
  expect(html).toContain(">••••••<");
  expect(html).not.toContain(">978.85<");

  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await toggle.click();
  await expect(primaryCard(page)).toContainText("978.85");
});

/**
 * Records every value the primary balance's visible text takes, from the very first
 * frame (installed before any page script runs). It proves what was actually painted,
 * instead of sampling the value once and hoping to catch an intermediate frame.
 */
async function recordBalanceFrames(page: Page) {
  await page.addInitScript(() => {
    const frames: string[] = [];
    Object.assign(window, { balanceFrames: frames });
    new MutationObserver(() => {
      for (const amount of document.querySelectorAll(
        '[data-testid="balance-amount"]',
      )) {
        if (amount.querySelector(".sr-only")?.textContent !== "978.85")
          continue;
        const shown = amount.querySelector("[aria-hidden]")?.textContent ?? "";
        if (frames.at(-1) !== shown) frames.push(shown);
      }
    }).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
  return async () => {
    // Wait for the count-up (if any) to land on the final value, then read the history.
    await expect(
      primaryCard(page).getByTestId("balance-amount").locator("[aria-hidden]"),
    ).toHaveText("978.85");
    return page.evaluate(
      () => (window as unknown as { balanceFrames: string[] }).balanceFrames,
    );
  };
}

test.describe("with motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the balance counts up to its final value", async ({ page }) => {
    const readFrames = await recordBalanceFrames(page);
    await login(page);

    const frames = await readFrames();
    // The recorder sees the intermediate values, so the reduced-motion case below
    // would catch a count-up too.
    expect(frames.length).toBeGreaterThan(2);
    expect(frames[0]).not.toBe("978.85");
    expect(frames.at(-1)).toBe("978.85");
  });
});

test.describe("with prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("the balance appears final at once, without counting up", async ({
    page,
  }) => {
    const readFrames = await recordBalanceFrames(page);
    await login(page);

    expect(await readFrames()).toEqual(["978.85"]);
  });
});
