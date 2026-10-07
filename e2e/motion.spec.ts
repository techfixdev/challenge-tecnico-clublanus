import {
  errors,
  expect,
  test,
  type Locator,
  type Page,
  type Request,
} from "@playwright/test";

import {
  allAnimations,
  isFullPrefetch,
  recordViewTransitions,
  skipWithoutViewTransitions,
  watchPrefetch,
  type TransitionEntry,
} from "./fixtures/view-transitions";

/*
 * Motion checks on real computed styles (jsdom has no CSS). Each case runs with and
 * without `prefers-reduced-motion: reduce` to prove the preference turns movement off.
 */

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("soygranate@clublanus.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("GRANATE1@");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

function movementRows(page: Page) {
  return page
    .getByRole("list", { name: "Lista de movimientos" })
    .getByRole("listitem");
}

/** Computed `animation-name` of each movement row (their staggered entrance). */
async function rowAnimations(page: Page) {
  // The rows stream in after the page shell; wait for them before reading styles.
  await expect(movementRows(page).first()).toBeVisible();
  return movementRows(page).evaluateAll((rows) =>
    rows.map((row) => getComputedStyle(row).animationName),
  );
}

/** Taps a row and returns the view transitions that the navigation started. */
async function openFirstDetail(page: Page) {
  const readLog = await recordViewTransitions(page);
  const link = movementRows(page).first().getByRole("link");
  const id = (await link.getAttribute("href"))?.match(
    /movimientos\/(\w+)/,
  )?.[1];
  await link.click();
  await expect(page.getByRole("link", { name: "Volver" })).toBeVisible();
  return { id, transitions: await readLog() };
}

function isFullListPrefetch(request: Request) {
  return isFullPrefetch(request, "/movimientos", "/movimientos/");
}

/**
 * Watches that prefetch from before the tap. It goes out before the detail is even
 * painted, and the router reads what it needs from the stream and then cancels it, so the
 * request ends as "failed" (`net::ERR_ABORTED`) rather than "finished": both mean the
 * list is in the router cache. `done()` resolves once the prefetch is over; if none
 * started (the router judged its cache fresh enough), after a short quiet period.
 */
function watchFullListPrefetch(page: Page) {
  return watchPrefetch(page, isFullListPrefetch);
}

/** Names of the movement tiles that morphed during the recorded transitions. */
function tileMorphs(transitions: TransitionEntry[]) {
  return new Set(
    transitions
      .flatMap(({ names }) => names)
      .filter((name) =>
        name.startsWith("::view-transition-group(movement-tile"),
      ),
  );
}

/** Home's quick actions and the view-transition name each one shares with its screen. */
const QUICK_ACTIONS = [
  { label: "Enviar", path: "/transferir", name: "quick-action-transfer" },
  { label: "Recibir", path: "/recibir", name: "quick-action-receive" },
] as const;

/** Opens Home and waits until it has fully prefetched the quick action's screen. */
async function openHomePrefetched(
  page: Page,
  { path }: (typeof QUICK_ACTIONS)[number],
) {
  const prefetch = watchPrefetch(page, (request) =>
    isFullPrefetch(request, path, "/"),
  );
  await page.goto("/");
  await prefetch.done();
}

/** Taps a Home quick action and returns the view transitions its navigation started. */
async function openQuickAction(
  page: Page,
  { label, path }: (typeof QUICK_ACTIONS)[number],
) {
  const readLog = await recordViewTransitions(page);
  await page
    .getByRole("navigation", { name: "Acciones rápidas" })
    .getByRole("link", { name: label })
    .click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  return readLog();
}

/** Leaves a quick action's screen through its "Volver" link and returns the transitions. */
async function closeQuickAction(page: Page) {
  const readLog = await recordViewTransitions(page);
  await page.getByRole("link", { name: "Volver", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  return readLog();
}

/** Names of the quick-action containers that morphed during the recorded transitions. */
function quickActionMorphs(transitions: TransitionEntry[]) {
  return new Set(
    transitions
      .flatMap(({ names }) => names)
      .filter((name) =>
        name.startsWith("::view-transition-group(quick-action"),
      ),
  );
}

/** Screen-level animations (push, pop, tab, reveal) among the recorded transitions. */
function screenMotion(transitions: TransitionEntry[]) {
  return allAnimations(transitions)
    .map(({ name }) => name)
    .filter((name) => /^(nav-|reveal$)/.test(name));
}

/** Leaves the detail ("Volver" or the browser's back) and returns the transitions it started. */
async function backToList(page: Page, via: "link" | "history") {
  const readLog = await recordViewTransitions(page);
  if (via === "link") await page.getByRole("link", { name: "Volver" }).click();
  else await page.goBack();
  await expect(movementRows(page).first()).toBeVisible();
  return readLog();
}

/** Computed `animation-name` of a throwaway skeleton's shimmer highlight. */
function shimmerAnimation(page: Page) {
  return page.evaluate(() => {
    const element = document.createElement("span");
    element.className = "skeleton block h-4 w-10";
    document.body.append(element);
    const name = getComputedStyle(element, "::after").animationName;
    element.remove();
    return name;
  });
}

/**
 * A computed style once the element's own transitions have finished (none running means
 * the value is already final), so the read never catches a value mid-transition.
 */
function settledStyle(locator: Locator, property: "scale" | "translate") {
  return locator.evaluate(async (element, name) => {
    await Promise.all(element.getAnimations().map((a) => a.finished));
    return getComputedStyle(element)[name];
  }, property);
}

/** Computed `scale` of the login button while it is held down (`:active`). */
async function pressedScale(page: Page) {
  const button = page.getByRole("button", { name: "Ingresar" });
  const box = await button.boundingBox();
  if (!box) throw new Error("The login button is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const scale = await settledStyle(button, "scale");
  await page.mouse.up();
  return scale;
}

/** Computed `translate` of the first movement row while the pointer rests on it. */
async function hoveredRowTranslate(page: Page) {
  const link = movementRows(page).first().getByRole("link");
  await link.hover();
  return settledStyle(link, "translate");
}

test.describe("with motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });

  test("skeletons shimmer and pressed buttons shrink", async ({ page }) => {
    await page.goto("/login");

    expect(await shimmerAnimation(page)).toBe("skeleton-shimmer");
    expect(await pressedScale(page)).toBe("0.97");
  });

  test("rows stagger in, lift on hover, and the tapped tile morphs into the detail", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/movimientos");

    expect(new Set(await rowAnimations(page))).toEqual(new Set(["row-enter"]));
    expect(await hoveredRowTranslate(page)).toBe("0px -2px");

    await skipWithoutViewTransitions(page);
    const { id, transitions } = await openFirstDetail(page);
    // Only the tapped movement's tile is named, so exactly one pair morphs.
    expect(tileMorphs(transitions)).toEqual(
      new Set([`::view-transition-group(movement-tile-${id})`]),
    );
    expect(Math.max(...transitions.map((t) => t.longestMs))).toBeGreaterThan(0);
  });

  test('"Volver" morphs the tile back into its row', async ({ page }) => {
    // The pair only forms when the list renders in the same commit as the navigation,
    // which needs "Volver"'s prefetch, and Next prefetches only in production (`next dev`
    // fetches on click and shows the list skeleton first). CI runs `next start`.
    test.skip(
      !process.env.CI,
      "Link prefetching only runs in production; run with CI=1 (next start)",
    );
    await login(page);
    await page.goto("/movimientos");
    await expect(movementRows(page).first()).toBeVisible();

    await skipWithoutViewTransitions(page);
    const listPrefetch = watchFullListPrefetch(page);
    const { id } = await openFirstDetail(page);
    // Tapping "Volver" before the list is in the router cache would fetch it on click,
    // show the skeleton first and form no pair: wait until the prefetch is done.
    await listPrefetch.done();
    const transitions = await backToList(page, "link");
    expect(tileMorphs(transitions)).toEqual(
      new Set([`::view-transition-group(movement-tile-${id})`]),
    );
  });

  test("Enviar and Recibir expand into their screens (container transform)", async ({
    page,
  }) => {
    // Like "Volver": the pair forms only when the screen commits without its skeleton,
    // which needs the quick actions' full prefetch, and Next prefetches only in production.
    test.skip(
      !process.env.CI,
      "Link prefetching only runs in production; run with CI=1 (next start)",
    );
    await login(page);
    await skipWithoutViewTransitions(page);

    for (const action of QUICK_ACTIONS) {
      await openHomePrefetched(page, action);
      const transitions = await openQuickAction(page, action);
      expect(quickActionMorphs(transitions)).toEqual(
        new Set([`::view-transition-group(${action.name})`]),
      );
      const longest = Math.max(...transitions.map((t) => t.longestMs));
      expect(longest).toBeGreaterThan(0);
      // Masks latency without adding any: the morph stays short.
      expect(longest).toBeLessThanOrEqual(300);
      // Only the container moves: the screens neither slide nor fade on their own.
      expect(screenMotion(transitions)).toEqual([]);
    }
  });

  test('"Volver" shrinks Enviar and Recibir back into their tiles', async ({
    page,
  }) => {
    // Same production-only condition as opening: Home must commit without its skeleton.
    test.skip(
      !process.env.CI,
      "Link prefetching only runs in production; run with CI=1 (next start)",
    );
    await login(page);
    await skipWithoutViewTransitions(page);

    for (const action of QUICK_ACTIONS) {
      await openHomePrefetched(page, action);
      // Home must be in the router cache before "Volver" (its full prefetch from the
      // screen), or it commits on its skeleton first and forms no pair.
      const homePrefetch = watchPrefetch(page, (request) =>
        isFullPrefetch(request, "/", action.path),
      );
      await openQuickAction(page, action);
      await homePrefetch.done();
      const transitions = await closeQuickAction(page);
      expect(quickActionMorphs(transitions)).toEqual(
        new Set([`::view-transition-group(${action.name})`]),
      );
      const longest = Math.max(...transitions.map((t) => t.longestMs));
      expect(longest).toBeGreaterThan(0);
      expect(longest).toBeLessThanOrEqual(300);
      expect(screenMotion(transitions)).toEqual([]);
    }
  });

  // Known framework limitation: the browser's back button restores the list on React's
  // blocking (sync) lane, and React only starts view transitions for transition lanes,
  // so no transition runs at all (no `document.startViewTransition` call). This pins the
  // current behavior precisely: every step must still work, and only the wait for a
  // transition may time out. Once Next/React animate traversals, the wait resolves, this
  // test turns red, and it should become a morph assertion like the "Volver" one.
  test("browser back returns to the list without a morph (framework limitation)", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/movimientos");
    await expect(movementRows(page).first()).toBeVisible();

    await skipWithoutViewTransitions(page);
    await openFirstDetail(page);
    const readLog = await recordViewTransitions(page);
    await page.goBack();
    await expect(movementRows(page).first()).toBeVisible();
    // The only accepted failure: the bounded wait for a transition times out.
    await expect(readLog({ timeout: 5_000 })).rejects.toBeInstanceOf(
      errors.TimeoutError,
    );
  });
});

test.describe("with prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("skeletons stay static and pressed buttons do not move", async ({
    page,
  }) => {
    await page.goto("/login");

    expect(await shimmerAnimation(page)).toBe("none");
    expect(await pressedScale(page)).toBe("none");
  });

  test("rows appear at once, stay put on hover, and navigation does not animate", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/movimientos");

    expect(new Set(await rowAnimations(page))).toEqual(new Set(["none"]));
    // Hovering does not lift the row either.
    expect(await hoveredRowTranslate(page)).toBe("none");

    await skipWithoutViewTransitions(page);
    const { transitions } = await openFirstDetail(page);
    // The transition still runs (state changes stay atomic), with zero-length animations.
    expect(transitions.length).toBeGreaterThan(0);
    for (const { longestMs } of transitions) expect(longestMs).toBe(0);
  });

  test("quick actions open and close their screens without a morph", async ({
    page,
  }) => {
    test.skip(
      !process.env.CI,
      "Link prefetching only runs in production; run with CI=1 (next start)",
    );
    await login(page);
    await skipWithoutViewTransitions(page);

    for (const action of QUICK_ACTIONS) {
      await openHomePrefetched(page, action);
      const opening = await openQuickAction(page, action);
      const closing = await closeQuickAction(page);
      for (const transitions of [opening, closing]) {
        expect(transitions.length).toBeGreaterThan(0);
        // Instant: no duration and no delay either (the incoming screen's fade-in is
        // delayed with motion allowed; a leftover delay would hide it for that long).
        for (const { longestMs, latestEndMs } of transitions) {
          expect(longestMs).toBe(0);
          expect(latestEndMs).toBe(0);
        }
      }
    }
  });
});
