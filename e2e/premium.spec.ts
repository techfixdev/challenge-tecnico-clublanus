import { expect, test, type Page } from "@playwright/test";

/*
 * Premium motion on real rendering (jsdom has no layout or 3D transforms). Each check
 * runs with and without `prefers-reduced-motion: reduce`.
 */

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("soygranate@clublanus.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("GRANATE1@");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

function primaryCardSurface(page: Page) {
  return page.getByTestId("living-card-surface").first();
}

/** Presses the primary card in its center and drags towards its top-right corner. */
async function dragPrimaryCard(page: Page) {
  const box = await page.getByTestId("living-card").first().boundingBox();
  if (!box) throw new Error("The primary card is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.95, box.y + box.height * 0.1, {
    steps: 8,
  });
}

/** Scrolls the page and waits until the scroll-linked values have caught up. */
async function scrollPage(page: Page, y: number) {
  await page.evaluate(
    (top) => window.scrollTo({ top, behavior: "instant" }),
    y,
  );
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

function computed(
  page: Page,
  testId: string,
  property: "opacity" | "transform",
) {
  return page
    .getByTestId(testId)
    .evaluate((element, name) => getComputedStyle(element)[name], property);
}

/**
 * Taps "Movimientos" in the nav and records the indicator's left edge on every frame,
 * from just before the tap until the navigation settles.
 */
async function switchTabRecordingIndicator(page: Page) {
  await page.evaluate(() => {
    const xs: number[] = [];
    Object.assign(window, { indicatorXs: xs });
    const started = performance.now();
    requestAnimationFrame(function sample() {
      const indicator = document.querySelector('[data-testid="nav-indicator"]');
      const x = indicator?.getBoundingClientRect().x;
      if (x !== undefined && xs.at(-1) !== x) xs.push(Math.round(x));
      if (performance.now() - started < 4000) requestAnimationFrame(sample);
    });
  });
  const nav = page.getByRole("navigation", { name: "Principal" });
  await nav.getByRole("link", { name: "Movimientos" }).click();
  await expect(page).toHaveURL(/\/movimientos$/);
  const movements = nav.getByRole("link", { name: "Movimientos" });
  await expect(movements.getByTestId("nav-indicator")).toBeVisible();
  const target = Math.round((await movements.boundingBox())!.x);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { indicatorXs: number[] }).indicatorXs.at(-1),
      ),
    )
    .toBe(target);
  const xs = await page.evaluate(
    () => (window as unknown as { indicatorXs: number[] }).indicatorXs,
  );
  return { xs, target };
}

function surfaceTransform(page: Page) {
  return primaryCardSurface(page).evaluate(
    (element) => getComputedStyle(element).transform,
  );
}

test.describe("with motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the card tilts under the finger and springs back on release", async ({
    page,
  }) => {
    await login(page);
    expect(await surfaceTransform(page)).toBe("none");

    await dragPrimaryCard(page);
    // A 3D rotation shows up as a matrix3d once the spring moves.
    await expect.poll(() => surfaceTransform(page)).toContain("matrix3d");

    await page.mouse.up();
    await expect.poll(() => surfaceTransform(page)).toBe("none");
  });

  test("swiping to the next card scales it up and moves the dot", async ({
    page,
  }) => {
    await login(page);
    const cards = page.getByRole("list", { name: "Tus tarjetas" });
    const visa = cards.getByRole("listitem").nth(1);
    const scaleOf = () =>
      visa.evaluate((element) => getComputedStyle(element).transform);

    // The peeking card rests smaller (scale 0.92) until it becomes the active one.
    expect(await scaleOf()).toMatch(/^matrix\(0\.92/);

    await page.getByRole("button", { name: "Tarjeta 2 de 2" }).click();

    await expect(
      page.getByRole("button", { name: "Tarjeta 2 de 2" }),
    ).toHaveAttribute("aria-current", "true");
    await expect.poll(scaleOf).toBe("none");
  });
  test("the header compacts into glass on scroll, and the filters stick under it", async ({
    page,
  }) => {
    await login(page);
    expect(await computed(page, "glass-header-backdrop", "opacity")).toBe("0");

    await scrollPage(page, 200);
    await expect
      .poll(() => computed(page, "glass-header-backdrop", "opacity"))
      .toBe("1");
    // Scaled to 85% (a 2D matrix starting with the scale).
    expect(await computed(page, "glass-header-title", "transform")).toMatch(
      /^matrix\(0\.85, 0, 0, 0\.85/,
    );
    expect(
      await page.getByText("Hola").evaluate((e) => getComputedStyle(e).opacity),
    ).toBe("0");

    await page.goto("/movimientos");
    await expect(
      page.getByRole("list", { name: "Lista de movimientos" }),
    ).toBeVisible();
    await scrollPage(page, 600);
    await expect
      .poll(() => computed(page, "sticky-filters-backdrop", "opacity"))
      .toBe("1");
    // The search box sits right under the compact header.
    const filters = await page.getByTestId("sticky-filters").boundingBox();
    expect(Math.round(filters!.y)).toBe(51);
    await expect(page.getByRole("searchbox")).toBeInViewport();
  });

  test("Home loads without layout shift (CLS < 0.05)", async ({ page }) => {
    await page.addInitScript(() => {
      const shifts = { total: 0 };
      Object.assign(window, { layoutShifts: shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[])
          if (!entry.hadRecentInput) shifts.total += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    const totalShift = () =>
      page.evaluate(
        () =>
          (window as unknown as { layoutShifts: { total: number } })
            .layoutShifts.total,
      );
    const sweepDone = async () => {
      // A streamed page arrives in a hidden container before React moves it into
      // place: wait until there is a single card.
      await expect(page.getByTestId("card-sweep")).toHaveCount(1);
      // The intro (light sweep, odometer roll) is over once the sweep reaches its end.
      await expect
        .poll(() =>
          page.getByTestId("card-sweep").evaluate((sweep) => {
            const { m41 } = new DOMMatrix(getComputedStyle(sweep).transform);
            return Math.round(m41 / sweep.getBoundingClientRect().width);
          }),
        )
        .toBe(4);
    };

    // Client navigation after login (odometer rolls), then a server-rendered reload.
    await login(page);
    await sweepDone();
    expect(await totalShift()).toBeLessThan(0.05);

    await page.reload();
    await sweepDone();
    expect(await totalShift()).toBeLessThan(0.05);
  });

  test("the nav indicator slides to the new section with a spring", async ({
    page,
  }) => {
    await login(page);
    const { xs, target } = await switchTabRecordingIndicator(page);
    // It passed through positions between the two items: it slid, it did not jump.
    const start = xs[0]!;
    expect(xs.some((x) => x > start && x < target)).toBe(true);
  });
});

test.describe("with prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("the header turns to glass without scaling, and the indicator jumps", async ({
    page,
  }) => {
    await login(page);
    await scrollPage(page, 200);
    await expect
      .poll(() => computed(page, "glass-header-backdrop", "opacity"))
      .toBe("1");
    expect(await computed(page, "glass-header-title", "transform")).toBe(
      "none",
    );

    await scrollPage(page, 0);
    const { xs, target } = await switchTabRecordingIndicator(page);
    expect(xs.every((x) => x === xs[0] || x === target)).toBe(true);
  });

  test("the card stays flat when dragged, and cards do not scale", async ({
    page,
  }) => {
    await login(page);
    await dragPrimaryCard(page);
    expect(await surfaceTransform(page)).toBe("none");
    await page.mouse.up();

    const visa = page
      .getByRole("list", { name: "Tus tarjetas" })
      .getByRole("listitem")
      .nth(1);
    expect(
      await visa.evaluate((element) => getComputedStyle(element).transform),
    ).toBe("none");
    await expect(page.getByTestId("card-sweep")).toHaveCount(0);
  });
});
