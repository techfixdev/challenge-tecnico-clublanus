import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

import { exhaustRevealBudget } from "./fixtures/rate-limits";
import { bringCardForward, primaryCard } from "./fixtures/screens";
import { login, loginUntilHomeSettles, SECOND_USER } from "./fixtures/session";
import { createThrowawayUser } from "./fixtures/throwaway-user";

/*
 * Per-card reveal: every card is masked on load (balance, full number, CVV), each eye
 * reveals only its own card by fetching that card's data, and the data masks itself
 * again after 30 seconds or when the tab is hidden.
 */

function visaCard(page: Page) {
  return page.getByRole("region", {
    name: "Tarjeta Visa terminada en 5678",
    exact: true,
  });
}

function eye(
  page: Page,
  card: "Mastercard terminada en 1234" | "Visa terminada en 5678",
) {
  return page
    .getByRole("button", { name: `Mostrar datos de la tarjeta ${card}` })
    .first();
}

type Details = { id: string; number: string; cvv: string; balance: string };

/** Every card's revealed data, through the API (the same session as the page). */
async function allDetails(request: APIRequestContext): Promise<Details[]> {
  const cards = (await (await request.get("/api/account/cards")).json()) as {
    data: { id: string }[];
  };
  return Promise.all(
    cards.data.map(async (card) => {
      const response = await request.get(
        `/api/account/cards/${card.id}/details`,
      );
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toBe("no-store");
      return ((await response.json()) as { data: Details }).data;
    }),
  );
}

test("every card starts masked, and the page carries no balance, full number or CVV", async ({
  page,
}) => {
  await login(page);
  await expect(shownMasks(page)).toHaveCount(2);
  for (const card of [primaryCard(page), visaCard(page)]) {
    await expect(card).toContainText("Saldo oculto");
    await expect(card.getByTestId("card-number")).toHaveText(
      /^•{4} •{4} •{4} \d{4}$/,
    );
  }

  const details = await allDetails(page.request);
  expect(details).toHaveLength(2);
  // The server-rendered HTML (RSC payload included) has none of the sensitive data.
  const html = await (await page.request.get("/")).text();
  for (const card of details) {
    expect(card.number).toMatch(/^\d{16}$/);
    expect(html).not.toContain(card.number);
    expect(html).not.toContain(
      card.number.slice(0, 4) + " " + card.number.slice(4, 8),
    );
  }
  for (const balance of ["978,85", "978.85", "312.400,50", "312400.5"]) {
    expect(html).not.toContain(balance);
  }
  expect(html).not.toContain('"cvv"');
  // Each CVV box is server-rendered masked.
  expect(
    html.match(/data-testid="card-cvv"[^>]*><span aria-hidden="true">•••</g),
  ).toHaveLength(2);
});

test("each eye reveals only its own card: balance, full number and CVV", async ({
  page,
}) => {
  await loginUntilHomeSettles(page);
  const details = await allDetails(page.request);
  const mastercard = details.find((card) => card.number.endsWith("1234"))!;

  await eye(page, "Mastercard terminada en 1234").click();

  await expect(primaryCard(page)).toContainText("978,85 dólares");
  const groups = mastercard.number.match(/\d{4}/g)!.join(" ");
  await expect(primaryCard(page).getByTestId("card-number")).toContainText(
    groups,
  );
  await expect(eye(page, "Mastercard terminada en 1234")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // The Visa card is untouched.
  await expect(visaCard(page)).toContainText("Saldo oculto");
  await expect(eye(page, "Visa terminada en 5678")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  // The CVV is on the back, revealed with the rest of this card.
  await expect(
    page
      .getByRole("region", {
        name: "Reverso de la tarjeta Mastercard terminada en 1234",
        includeHidden: true,
      })
      .getByTestId("card-cvv"),
  ).toContainText(mastercard.cvv);

  // The Visa eye reveals the Visa card alone, in pesos.
  await bringCardForward(page, 2, 2);
  await eye(page, "Visa terminada en 5678").click();
  await expect(visaCard(page)).toContainText("312.400,50 pesos");

  // Hiding the Mastercard leaves the Visa revealed.
  await bringCardForward(page, 1, 2);
  await eye(page, "Mastercard terminada en 1234").click();
  await expect(primaryCard(page)).toContainText("Saldo oculto");
  await expect(primaryCard(page)).not.toContainText(groups);
  await expect(visaCard(page)).toContainText("312.400,50 pesos");
});

test("revealed data masks itself again after 30 seconds", async ({ page }) => {
  await page.clock.install();
  await loginUntilHomeSettles(page);
  await eye(page, "Mastercard terminada en 1234").click();
  await expect(primaryCard(page)).toContainText("978,85 dólares");

  await page.clock.fastForward(29_000);
  await expect(primaryCard(page)).toContainText("978,85 dólares");

  await page.clock.fastForward(2_000);
  await expect(primaryCard(page)).toContainText("Saldo oculto");
  await expect(primaryCard(page).getByTestId("card-number")).toHaveText(
    "•••• •••• •••• 1234",
  );
});

test("revealed data masks itself again when the tab is hidden", async ({
  page,
}) => {
  await loginUntilHomeSettles(page);
  await eye(page, "Mastercard terminada en 1234").click();
  await expect(primaryCard(page)).toContainText("978,85 dólares");

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await expect(primaryCard(page)).toContainText("Saldo oculto");
});

test("the details endpoint needs a session and only serves the owner's cards", async ({
  page,
  browser,
}) => {
  // Another user's card id, read from that user's own session.
  const other = await browser.newPage();
  await login(other, SECOND_USER);
  const hinchaCards = (await (
    await other.request.get("/api/account/cards")
  ).json()) as {
    data: { id: string }[];
  };
  await other.close();

  // No session: 401.
  const anonymous = await page.request.get(
    `/api/account/cards/${hinchaCards.data[0].id}/details`,
  );
  expect(anonymous.status()).toBe(401);
  expect(anonymous.headers()["cache-control"]).toBe("no-store");

  await login(page);
  const foreign = await page.request.get(
    `/api/account/cards/${hinchaCards.data[0].id}/details`,
  );
  expect(foreign.status()).toBe(404);
  expect(foreign.headers()["cache-control"]).toBe("no-store");
  expect(await foreign.text()).not.toMatch(/\d{16}/);
});

test.describe("past the reveal limit", () => {
  let removeThrowawayUser: (() => Promise<void>) | undefined;
  test.afterEach(async () => {
    await removeThrowawayUser?.();
    removeThrowawayUser = undefined;
  });

  test("past 10 reveals in 10 minutes, the eye says how long to wait and the API answers 429", async ({
    page,
  }) => {
    // A user of its own: a login resets that user's counters, and no spec running in
    // parallel knows this one, so the spent budget stays spent for the whole scenario.
    const user = await createThrowawayUser();
    removeThrowawayUser = user.remove;
    await loginUntilHomeSettles(page, user);
    await exhaustRevealBudget(user.email);
    const firstCard = page
      .getByRole("list", { name: "Tus tarjetas" })
      .getByRole("region")
      .first();

    await firstCard
      .getByRole("button", { name: /^Mostrar datos de la tarjeta/ })
      .click();

    await expect(firstCard.getByTestId("card-reveal-notice")).toContainText(
      /^Demasiados intentos\. Probá de nuevo en \d+ minutos?\.$/,
    );
    await expect(
      firstCard.getByRole("button", { name: /^Mostrar datos de la tarjeta/ }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(firstCard).toContainText("Saldo oculto");

    const cards = (await (
      await page.request.get("/api/account/cards")
    ).json()) as {
      data: { id: string }[];
    };
    const refused = await page.request.get(
      `/api/account/cards/${cards.data[0].id}/details`,
    );
    expect(refused.status()).toBe(429);
    expect(Number(refused.headers()["retry-after"])).toBeGreaterThan(0);
    expect(refused.headers()["cache-control"]).toBe("no-store");
    expect(
      ((await refused.json()) as { error: { code: string } }).error.code,
    ).toBe("RATE_LIMITED");
    expect(await refused.text()).not.toMatch(/\d{16}/);
  });
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
 * painted, instead of sampling once and hoping to catch an intermediate frame. It also
 * records the columns' layout (each one's offset and width) whenever it changes, so a
 * roll that resizes a column (the number jittering sideways) shows up.
 */
async function recordBalanceFrames(page: Page) {
  await installOdometerReader(page);
  await page.addInitScript(() => {
    const frames: string[] = [];
    const layouts: string[] = [];
    Object.assign(window, { balanceFrames: frames, balanceLayouts: layouts });
    const read = (
      window as unknown as { readOdometer: (amount: Element) => string }
    ).readOdometer;
    requestAnimationFrame(function sample() {
      for (const amount of document.querySelectorAll(
        '[data-testid="balance-amount"]',
      )) {
        if (amount.querySelector(".sr-only")?.textContent !== "978,85 dólares")
          continue;
        const shown = read(amount);
        if (frames.at(-1) !== shown) frames.push(shown);
        const layer = amount.querySelector("[data-odometer]");
        if (!layer) continue;
        // Relative to the first column: the row as a whole may move with the card.
        const cells = Array.from(
          layer.children as HTMLCollectionOf<HTMLElement>,
        );
        const origin = cells[0]?.offsetLeft ?? 0;
        const layout = cells
          .map((cell) => `${cell.offsetLeft - origin}+${cell.offsetWidth}`)
          .join(" ");
        if (layouts.at(-1) !== layout) layouts.push(layout);
      }
      requestAnimationFrame(sample);
    });
  });
  return async () => {
    // Wait for the roll (if any) to land on the final value, then read the history.
    await expect.poll(() => readPrimaryOdometer(page)).toBe("978,85");
    // Two frames later the sampler has recorded the settled value too.
    return page.evaluate(async () => {
      for (let frame = 0; frame < 2; frame += 1)
        await new Promise(requestAnimationFrame);
      const { balanceFrames, balanceLayouts } = window as unknown as {
        balanceFrames: string[];
        balanceLayouts: string[];
      };
      return { frames: balanceFrames, layouts: balanceLayouts };
    });
  };
}

test.describe("with motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });

  test("a revealed balance rolls like an odometer to its exact value", async ({
    page,
  }) => {
    const readFrames = await recordBalanceFrames(page);
    await loginUntilHomeSettles(page);
    await eye(page, "Mastercard terminada en 1234").click();

    const { frames, layouts } = await readFrames();
    // The recorder sees the digits mid-roll, so the reduced-motion case below would
    // catch a roll too.
    expect(frames.length).toBeGreaterThan(2);
    expect(frames[0]).not.toBe("978,85");
    expect(frames.at(-1)).toBe("978,85");
    // Every column kept its place and width through the whole roll: no jitter.
    expect(layouts).toHaveLength(1);
  });
});

test.describe("with prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("a revealed balance appears final at once, without rolling", async ({
    page,
  }) => {
    const readFrames = await recordBalanceFrames(page);
    await loginUntilHomeSettles(page);
    await eye(page, "Mastercard terminada en 1234").click();

    expect((await readFrames()).frames).toEqual(["978,85"]);
  });
});
