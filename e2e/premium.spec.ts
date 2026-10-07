import { expect, test, type Page } from "@playwright/test";

import {
  fillLoginForm,
  login,
  loginUntilHomeSettles,
} from "./fixtures/session";
import { waitForScreenToSettle } from "./fixtures/view-transitions";

/*
 * Premium motion on real rendering (jsdom has no layout or 3D transforms). Each check
 * runs with and without `prefers-reduced-motion: reduce`.
 */

function primaryCardSurface(page: Page) {
  return page.getByTestId("living-card-surface").first();
}

/**
 * Presses the primary card in its center and drags towards its top edge. Mostly
 * vertical on purpose: a sideways drag belongs to the carousel, which flattens the card.
 */
async function dragPrimaryCard(page: Page) {
  const box = await page.getByTestId("living-card").first().boundingBox();
  if (!box) throw new Error("The primary card is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.05, {
    steps: 8,
  });
}

function cardList(page: Page) {
  return page.getByRole("list", { name: "Tus tarjetas" });
}

/**
 * How far the deck has travelled towards the later cards, in px (0 with the first card in
 * front): the row's scroll position, minus the cards' own shift past either end.
 */
function deckOffset(page: Page) {
  return cardList(page).evaluate((list) => {
    const first = list.firstElementChild!;
    const shift = new DOMMatrix(getComputedStyle(first).transform).m41;
    return Math.round(list.scrollLeft - shift);
  });
}

/** Where the deck rests with the second card in front. */
function secondCardRest(page: Page) {
  return cardList(page).evaluate((list) => {
    const [first, second] = list.children as HTMLCollectionOf<HTMLElement>;
    const max = list.scrollWidth - list.clientWidth;
    return Math.round(Math.min(second!.offsetLeft - first!.offsetLeft, max));
  });
}

/** Presses the primary card and drags it sideways by `dx`, holding the press. */
async function pressAndDragDeck(page: Page, dx: number, steps = 10) {
  const box = await page.getByTestId("living-card").first().boundingBox();
  if (!box) throw new Error("The primary card is not visible");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + 2, { steps });
  return { x: x + dx, y: y + 2 };
}

/**
 * Flicks the primary card sideways by `dx`: pressed, moved in three steps and lifted,
 * 16ms apart (one frame each). The events carry those times themselves (CDP's
 * `timestamp`), so the throw's velocity is the same however long the browser or the test
 * runner takes to deliver them; with `page.mouse`, a loaded machine stretches a flick
 * into a slow drag.
 */
async function flickDeck(page: Page, dx: number) {
  const box = await page.getByTestId("living-card").first().boundingBox();
  if (!box) throw new Error("The primary card is not visible");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const start = Date.now() / 1000;
  const frames: Array<
    ["mousePressed" | "mouseMoved" | "mouseReleased", number]
  > = [
    ["mousePressed", 0],
    ["mouseMoved", dx / 3],
    ["mouseMoved", (2 * dx) / 3],
    ["mouseMoved", dx],
    ["mouseReleased", dx],
  ];
  for (const [index, [type, offset]] of frames.entries()) {
    await cdp.send("Input.dispatchMouseEvent", {
      type,
      x: x + offset,
      y: y + 2,
      button: "left",
      buttons: type === "mouseReleased" ? 0 : 1,
      clickCount: 1,
      timestamp: start + index * 0.016,
    });
  }
  await cdp.detach();
}

function currentDot(page: Page) {
  return page.locator('button[aria-current="true"][aria-label^="Tarjeta "]');
}

/** A window scroll position: a pixel offset, or as far down as the page goes. */
type ScrollTarget = number | "end";

/**
 * Home's scroll for a fully compact header: its end, read from the page itself. Home is
 * short (its rows share one grouped surface, about 56px of scroll at 390×844), so a fixed
 * offset past the header's collapse and glass fade would sit right at the edge of what
 * Home can reach; its end is past both however tall the content is.
 */
const HOME_COMPACT_SCROLL: ScrollTarget = "end";

/**
 * Scrolls the window to `target` (from one pixel away, so a scroll event always fires)
 * and waits two frames for scroll-linked styles. On a cold server the page can still be
 * streaming (too short to scroll that far), so it retries until the window really sits
 * there, re-reading the page's end each time.
 */
async function scrollPage(page: Page, target: ScrollTarget) {
  await expect
    .poll(
      () =>
        page.evaluate(async (wanted) => {
          const frame = () =>
            new Promise((resolve) => requestAnimationFrame(resolve));
          const top =
            wanted === "end"
              ? document.documentElement.scrollHeight - window.innerHeight
              : wanted;
          window.scrollTo({ top: Math.max(0, top - 1), behavior: "instant" });
          await frame();
          window.scrollTo({ top, behavior: "instant" });
          await frame();
          await frame();
          return Math.round(window.scrollY) === Math.round(top);
        }, target),
      { message: `the window scrolls to ${target}` },
    )
    .toBe(true);
}

/**
 * Polls a scroll-linked style, scrolling to `target` before each read. Scroll-linked values
 * only update on scroll events, and one sent before hydration finished is never seen,
 * which a single scroll followed by a poll would wait on forever.
 */
function styleAfterScroll(
  page: Page,
  target: ScrollTarget,
  testId: string,
  property: "opacity" | "transform",
) {
  return expect.poll(async () => {
    await scrollPage(page, target);
    return computed(page, testId, property);
  });
}

/**
 * The rendered instance of a test id. A route the router keeps around (e.g. a previous
 * Movements page during a navigation in a long combined run) can still be in the DOM,
 * hidden; only the one on screen matters, and strict mode must not trip on the other.
 */
function onScreen(page: Page, testId: string) {
  return page.getByTestId(testId).filter({ visible: true });
}

function computed(
  page: Page,
  testId: string,
  property: "opacity" | "transform",
) {
  return onScreen(page, testId).evaluate(
    (element, name) => getComputedStyle(element)[name],
    property,
  );
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
    await loginUntilHomeSettles(page);
    expect(await surfaceTransform(page)).toBe("none");

    await dragPrimaryCard(page);
    // A 3D rotation shows up as a matrix3d once the spring moves.
    await expect.poll(() => surfaceTransform(page)).toContain("matrix3d");

    await page.mouse.up();
    await expect.poll(() => surfaceTransform(page)).toBe("none");
  });

  test("a dot brings the next card forward, scaling it up", async ({
    page,
  }) => {
    await loginUntilHomeSettles(page);
    const cards = page.getByRole("list", { name: "Tus tarjetas" });
    const visa = cards.getByRole("listitem").nth(1);
    const scaleOf = () =>
      visa.evaluate((element) => getComputedStyle(element).transform);

    // The peeking card rests smaller (scale 0.94) until it becomes the active one.
    expect(await scaleOf()).toMatch(/^matrix\(0\.94/);

    await page.getByRole("button", { name: "Tarjeta 2 de 2" }).click();

    await expect(
      page.getByRole("button", { name: "Tarjeta 2 de 2" }),
    ).toHaveAttribute("aria-current", "true");
    await expect.poll(scaleOf).toBe("none");
  });

  test("the deck follows a drag 1:1 and a slow release settles on the nearest card", async ({
    page,
  }) => {
    await loginUntilHomeSettles(page);
    const rest = await secondCardRest(page);

    const at = await pressAndDragDeck(page, -160);
    // Under the finger: the deck moved exactly as far as the finger did.
    await expect.poll(() => deckOffset(page)).toBe(160);
    // The sideways drag took the press over: the card dropped its tilt.
    await expect.poll(() => surfaceTransform(page)).toBe("none");
    // Hold still before letting go: no velocity, so the nearest card wins.
    await page.waitForTimeout(150);
    await page.mouse.move(at.x, at.y);
    await page.mouse.up();

    await expect(currentDot(page)).toHaveAttribute(
      "aria-label",
      "Tarjeta 2 de 2",
    );
    await expect.poll(() => deckOffset(page)).toBe(rest);
  });

  test("a quick flick turns the card even after a short drag; a slow one springs back", async ({
    page,
  }) => {
    await loginUntilHomeSettles(page);
    const rest = await secondCardRest(page);

    // Slow: the finger stops before letting go, so the deck returns to the first card.
    const at = await pressAndDragDeck(page, -50);
    await page.waitForTimeout(150);
    await page.mouse.move(at.x, at.y);
    await page.mouse.up();
    await expect.poll(() => deckOffset(page)).toBe(0);
    await expect(currentDot(page)).toHaveAttribute(
      "aria-label",
      "Tarjeta 1 de 2",
    );

    // Quick: the same distance released while moving carries on to the next card.
    await flickDeck(page, -50);
    await expect.poll(() => deckOffset(page)).toBe(rest);
    await expect(currentDot(page)).toHaveAttribute(
      "aria-label",
      "Tarjeta 2 de 2",
    );
  });

  test("past the first card the deck resists, then returns", async ({
    page,
  }) => {
    await loginUntilHomeSettles(page);

    await pressAndDragDeck(page, 150);
    // A faint pull, far less than the finger's travel.
    const pulled = await deckOffset(page);
    expect(pulled).toBeLessThan(0);
    expect(pulled).toBeGreaterThan(-40);
    await page.mouse.up();

    await expect.poll(() => deckOffset(page)).toBe(0);
  });

  test("the arrow keys move between cards", async ({ page }) => {
    await loginUntilHomeSettles(page);
    const rest = await secondCardRest(page);

    await cardList(page).focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => deckOffset(page)).toBe(rest);
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => deckOffset(page)).toBe(0);
  });
  test("the header compacts into glass on scroll, and the filters stick under it", async ({
    page,
  }) => {
    await loginUntilHomeSettles(page);
    expect(await computed(page, "glass-header-backdrop", "opacity")).toBe("0");

    await styleAfterScroll(
      page,
      HOME_COMPACT_SCROLL,
      "glass-header-backdrop",
      "opacity",
    ).toBe("1");
    // Scaled to 85% (a 2D matrix starting with the scale).
    expect(await computed(page, "glass-header-title", "transform")).toMatch(
      /^matrix\(0\.85, 0, 0, 0\.85/,
    );
    expect(
      await page.getByText("Hola").evaluate((e) => getComputedStyle(e).opacity),
    ).toBe("0");

    await page.goto("/movimientos");
    await expect(
      page.getByRole("region", { name: "Lista de movimientos" }),
    ).toBeVisible();
    await styleAfterScroll(
      page,
      600,
      "sticky-filters-backdrop",
      "opacity",
    ).toBe("1");
    // The search box sits right under the compact header.
    const filters = await onScreen(page, "sticky-filters").boundingBox();
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
    /** Finite animations still playing (rows, the reveal); the looping shimmer is not one. */
    const runningEntranceAnimations = () =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.playState === "running" &&
                animation.effect?.getComputedTiming().iterations !== Infinity,
            ).length,
      );
    const entranceDone = async () => {
      // A streamed page arrives in a hidden container before React moves it into
      // place: wait until there is a single card list.
      await expect(
        page.getByRole("list", { name: "Tus tarjetas" }),
      ).toHaveCount(1);
      // The latest movements stream in last, and their rows rise in a stagger.
      await expect(
        page
          .getByRole("region", { name: "Últimos movimientos" })
          .getByRole("listitem")
          .first(),
      ).toBeVisible();
      await waitForScreenToSettle(page);
      // Polled, not awaited once: a snapshot of the running animations would miss one
      // that starts a moment later (content that lands after it).
      await expect
        .poll(runningEntranceAnimations, {
          message: "the entrance animations finish",
        })
        .toBe(0);
    };

    // Client navigation after login (odometer rolls), then a server-rendered reload.
    await loginUntilHomeSettles(page);
    await entranceDone();
    expect(await totalShift()).toBeLessThan(0.05);

    await page.reload();
    await entranceDone();
    expect(await totalShift()).toBeLessThan(0.05);
  });

  test("the nav indicator slides to the new section with a spring", async ({
    page,
  }) => {
    await loginUntilHomeSettles(page);
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
    await loginUntilHomeSettles(page);
    await styleAfterScroll(
      page,
      HOME_COMPACT_SCROLL,
      "glass-header-backdrop",
      "opacity",
    ).toBe("1");
    expect(await computed(page, "glass-header-title", "transform")).toBe(
      "none",
    );

    await scrollPage(page, 0);
    const { xs, target } = await switchTabRecordingIndicator(page);
    expect(xs.every((x) => x === xs[0] || x === target)).toBe(true);
  });

  // Regression guard: scroll-linked styles routed through Motion's lazy renderer (which
  // loads after hydration) lose a scroll made before it arrives, leaving the header
  // transparent. Holding the app's scripts back makes that window certain instead of a
  // race against a slow chunk.
  test("the header follows a scroll made before Motion's features load", async ({
    page,
  }) => {
    let holdScripts = false;
    await page.route("**/_next/static/chunks/**", async (route) => {
      if (holdScripts) await new Promise((done) => setTimeout(done, 1_500));
      await route.continue();
    });
    await fillLoginForm(page);
    holdScripts = true;
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/$/);

    await styleAfterScroll(
      page,
      HOME_COMPACT_SCROLL,
      "glass-header-backdrop",
      "opacity",
    ).toBe("1");
  });

  test("the card stays flat when dragged, and cards do not scale", async ({
    page,
  }) => {
    await loginUntilHomeSettles(page);
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

  test("the deck still follows the finger, and lands on its card at once", async ({
    page,
  }) => {
    await loginUntilHomeSettles(page);
    const rest = await secondCardRest(page);

    await pressAndDragDeck(page, -160);
    expect(await deckOffset(page)).toBe(160);
    await page.mouse.up();

    // No glide: two frames after the release it already rests on the next card.
    await page.evaluate(
      () =>
        new Promise((done) =>
          requestAnimationFrame(() => requestAnimationFrame(done)),
        ),
    );
    expect(await deckOffset(page)).toBe(rest);
  });
});
