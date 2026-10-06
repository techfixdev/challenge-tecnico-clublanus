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
  await installOdometerReader(page);
  await login(page);
  const toggle = page.getByRole("button", { name: "Ocultar saldo" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(primaryCard(page)).toContainText("978.85");

  await toggle.click();

  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  const cards = page.getByRole("list", { name: "Tus tarjetas" });
  await expect(shownMasks(page)).toHaveCount(2);
  await expect(cards).not.toContainText("978.85");

  // The server renders the choice (cookie): the HTML already shows the mask, tells
  // screen readers "Saldo oculto" and has no rendered balance, so a hidden balance
  // never flashes before hydration.
  const html = await (await page.request.get("/")).text();
  expect(html).toContain('data-balance-mask="true" data-state="shown"');
  expect(html).toContain(">Saldo oculto<");
  expect(html).not.toContain(">978.85<");

  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(shownMasks(page)).toHaveCount(2);

  await toggle.click();
  await expect(primaryCard(page)).toContainText("978.85");
  await expect(shownMasks(page)).toHaveCount(0);
  // Showing it again rolls the digits back up to the exact balance.
  await expect.poll(() => readPrimaryOdometer(page)).toBe("978.85");
});

function shownMasks(page: Page) {
  return page
    .getByRole("list", { name: "Tus tarjetas" })
    .locator('[data-balance-mask][data-state="shown"]');
}

/**
 * Installs `window.readOdometer(amount)`: the text an odometer shows right now, read from
 * the geometry (which row of each 0–9 strip sits in its window). A digit caught between
 * two rows reads as "~".
 */
async function installOdometerReader(page: Page) {
  await page.addInitScript(() => {
    Object.assign(window, {
      readOdometer(amount: Element) {
        const layer = amount.querySelector("[data-odometer]");
        if (!layer) return "";
        return Array.from(layer.children, (cell) => {
          const strip = cell.querySelector("[data-digit]");
          if (!strip) return cell.textContent ?? "";
          const top = cell.getBoundingClientRect().top;
          const row = Array.from(strip.children).find(
            (digit) => Math.abs(digit.getBoundingClientRect().top - top) < 0.5,
          );
          return row?.textContent ?? "~";
        }).join("");
      },
    });
  });
}

function readPrimaryOdometer(page: Page) {
  return primaryCard(page)
    .getByTestId("balance-amount")
    .evaluate((amount) =>
      (
        window as unknown as { readOdometer: (amount: Element) => string }
      ).readOdometer(amount),
    );
}

/**
 * Records every value the primary odometer shows, sampled on every animation frame from
 * the first one (installed before any page script runs). It proves what was actually
 * painted, instead of sampling once and hoping to catch an intermediate frame.
 */
async function recordBalanceFrames(page: Page) {
  await installOdometerReader(page);
  await page.addInitScript(() => {
    const frames: string[] = [];
    Object.assign(window, { balanceFrames: frames });
    const read = (
      window as unknown as { readOdometer: (amount: Element) => string }
    ).readOdometer;
    requestAnimationFrame(function sample() {
      for (const amount of document.querySelectorAll(
        '[data-testid="balance-amount"]',
      )) {
        if (amount.querySelector(".sr-only")?.textContent !== "978.85")
          continue;
        const shown = read(amount);
        if (frames.at(-1) !== shown) frames.push(shown);
      }
      requestAnimationFrame(sample);
    });
  });
  return async () => {
    // Wait for the roll (if any) to land on the final value, then read the history.
    await expect.poll(() => readPrimaryOdometer(page)).toBe("978.85");
    // Two frames later the sampler has recorded the settled value too.
    return page.evaluate(async () => {
      for (let frame = 0; frame < 2; frame += 1)
        await new Promise(requestAnimationFrame);
      return (window as unknown as { balanceFrames: string[] }).balanceFrames;
    });
  };
}

test.describe("with motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the balance rolls like an odometer to its exact value", async ({
    page,
  }) => {
    const readFrames = await recordBalanceFrames(page);
    await login(page);

    const frames = await readFrames();
    // The recorder sees the digits mid-roll, so the reduced-motion case below would
    // catch a roll too.
    expect(frames.length).toBeGreaterThan(2);
    expect(frames[0]).not.toBe("978.85");
    expect(frames.at(-1)).toBe("978.85");
  });
});

test.describe("with prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("the balance appears final at once, without rolling", async ({
    page,
  }) => {
    const readFrames = await recordBalanceFrames(page);
    await login(page);

    expect(await readFrames()).toEqual(["978.85"]);
  });
});
