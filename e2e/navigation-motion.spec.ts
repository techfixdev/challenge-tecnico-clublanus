import { expect, test, type Page } from "@playwright/test";

import {
  allAnimations,
  animationsOf,
  isFullPrefetch,
  keyframesOf,
  recordViewTransitions,
  settle,
  skipWithoutViewTransitions,
  trackNetwork,
  watchPrefetch,
  type TransitionEntry,
} from "./fixtures/view-transitions";

/*
 * iOS-like navigation motion (shared/ui/motion/navigation.ts), on real computed styles:
 * push (forward), pop (in-app "Volver"), instant tab switch, pinned chrome, and the branded
 * cold-load intro. Each case runs with and without `prefers-reduced-motion: reduce`.
 */

async function login(page: Page) {
  trackNetwork(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill("soygranate@clublanus.com");
  await page.getByLabel("Contraseña", { exact: true }).fill("GRANATE1@");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/$/);
}

function movementRows(page: Page) {
  return page
    .getByRole("region", { name: "Lista de movimientos" })
    .getByRole("listitem");
}

function mainNav(page: Page) {
  return page.getByRole("navigation", { name: "Principal" });
}

/** Opens Movimientos (rows on screen) and returns the transitions of tapping a row. */
async function pushFirstDetail(page: Page) {
  await page.goto("/movimientos");
  await expect(movementRows(page).first()).toBeVisible();
  // The month summary streams in with its own reveal: a reveal landing mid-push would
  // replace (skip) the push's animation, so the tap waits for the screen to be complete.
  await expect(page.getByText("Ingresos").first()).toBeVisible();
  await settle(page);
  await skipWithoutViewTransitions(page);
  const readLog = await recordViewTransitions(page);
  await movementRows(page).first().getByRole("link").click();
  await expect(page.getByRole("link", { name: "Volver" })).toBeVisible();
  return readLog({ className: "nav-push-in" });
}

/** Durations of the screen slides (push and pop share the same two keyframes). */
function slideDurations(transitions: TransitionEntry[]) {
  return allAnimations(transitions)
    .filter(({ name }) => name.startsWith("nav-slide-"))
    .map(({ durationMs }) => durationMs);
}

/**
 * The bottom nav takes part in the transition under its own name (so the screens never
 * draw over it) and none of its pseudo-elements animate: it stays put.
 */
function expectBottomNavPinned(transitions: TransitionEntry[]) {
  expect(transitions.some(({ newClasses }) => "bottom-nav" in newClasses)).toBe(
    true,
  );
  const navAnimations = allAnimations(transitions).filter(({ pseudo }) =>
    pseudo.endsWith("(bottom-nav)"),
  );
  expect(navAnimations).toEqual([]);
}

type IntroStyle = { pointerEvents: string; display: string; endMs: number };

/**
 * Records the branded intro's computed style at its first paint (it may be gone a few
 * hundred milliseconds later): install before the navigation, read after it.
 */
async function watchIntro(page: Page) {
  await page.addInitScript(() => {
    const record = (element: Element) => {
      const style = getComputedStyle(element);
      const ms = (value: string) =>
        value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000;
      Object.assign(window, {
        introSeen: {
          pointerEvents: style.pointerEvents,
          display: style.display,
          endMs: ms(style.animationDelay) + ms(style.animationDuration),
        },
      });
    };
    new MutationObserver((records, observer) => {
      for (const { addedNodes } of records) {
        for (const node of addedNodes) {
          if (
            node instanceof Element &&
            node.matches("[data-testid=brand-intro]")
          ) {
            // At its first paint: styles (render-blocking) are applied by then.
            requestAnimationFrame(() => record(node));
            observer.disconnect();
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
}

function introSeen(page: Page) {
  return page.evaluate(
    () => (window as unknown as { introSeen?: IntroStyle }).introSeen ?? null,
  );
}

test.describe("with motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });

  test("a row pushes its detail in from the right; the list shifts left and dims", async ({
    page,
  }) => {
    await login(page);
    const transitions = await pushFirstDetail(page);

    expect(keyframesOf(transitions, "new", "nav-push-in")).toEqual(
      new Set(["nav-slide-from-edge"]),
    );
    expect(keyframesOf(transitions, "old", "nav-push-out")).toEqual(
      new Set(["nav-slide-to-parallax"]),
    );
    for (const duration of slideDurations(transitions)) {
      expect(duration).toBeGreaterThanOrEqual(350);
      expect(duration).toBeLessThanOrEqual(420);
    }
    // The tapped tile still morphs into the detail, on top of the push.
    expect(
      allAnimations(transitions).some(({ pseudo }) =>
        pseudo.startsWith("::view-transition-group(movement-tile-"),
      ),
    ).toBe(true);
    expectBottomNavPinned(transitions);
  });

  test('"Volver" pops back: the detail slides out to the right over the returning list', async ({
    page,
  }) => {
    await login(page);
    await pushFirstDetail(page);

    await settle(page);
    const readLog = await recordViewTransitions(page);
    await page.getByRole("link", { name: "Volver" }).click();
    await expect(movementRows(page).first()).toBeVisible();
    const transitions = await readLog({ className: "nav-pop-in" });

    expect(keyframesOf(transitions, "old", "nav-pop-out")).toEqual(
      new Set(["nav-slide-to-edge"]),
    );
    expect(keyframesOf(transitions, "new", "nav-pop-in")).toEqual(
      new Set(["nav-slide-from-parallax"]),
    );
    // Never a push on the way back.
    expect(keyframesOf(transitions, "new", "nav-push-in")).toEqual(new Set());
    expectBottomNavPinned(transitions);
  });

  test('"Ver todos" pushes Movimientos over Home, under a pinned header', async ({
    page,
  }) => {
    // Wait for Home's full prefetch of the list: then it commits ready, with its header
    // (on its skeleton, which has none, the header would leave with Home instead).
    const prefetch = watchPrefetch(page, (request) =>
      isFullPrefetch(request, "/movimientos", "/"),
    );
    await login(page);
    await skipWithoutViewTransitions(page);
    await prefetch.done();
    await settle(page);
    const readLog = await recordViewTransitions(page);
    await page.getByRole("link", { name: "Ver todos" }).click();
    await expect(page).toHaveURL(/\/movimientos$/);
    const transitions = await readLog({ className: "nav-push-in" });

    expect(keyframesOf(transitions, "new", "nav-push-in")).toEqual(
      new Set(["nav-slide-from-edge"]),
    );
    expect(keyframesOf(transitions, "old", "nav-push-out")).toEqual(
      new Set(["nav-slide-to-parallax"]),
    );
    // Both screens have a header: it is one shared element whose box never moves
    // (no group animation); only its two contents crossfade in place.
    const paired = transitions.find(
      ({ oldClasses, newClasses }) =>
        "screen-header" in oldClasses && "screen-header" in newClasses,
    );
    expect(paired).toBeDefined();
    const headerGroup = allAnimations(transitions).filter(
      ({ pseudo }) => pseudo === "::view-transition-group(screen-header)",
    );
    expect(headerGroup).toEqual([]);
    expectBottomNavPinned(transitions);
  });

  test("switching tabs swaps the sections instantly: no fade, no scale, no slide", async ({
    page,
  }) => {
    await login(page);
    await skipWithoutViewTransitions(page);
    await settle(page);
    const readLog = await recordViewTransitions(page);
    await mainNav(page).getByRole("link", { name: "Movimientos" }).click();
    await expect(movementRows(page).first()).toBeVisible();
    const transitions = await readLog({ className: "nav-tab-in" });

    // The section still takes part in the transition (it stays in sync with the header
    // swap), but neither its old nor its new image animates: it is simply there.
    expect(
      transitions.some(({ newClasses }) =>
        Object.values(newClasses).some((classes) =>
          classes.split(" ").includes("nav-tab-in"),
        ),
      ),
    ).toBe(true);
    expect(animationsOf(transitions, "new", "nav-tab-in")).toEqual([]);
    expect(animationsOf(transitions, "old", "nav-tab-out")).toEqual([]);
    expect(slideDurations(transitions)).toEqual([]);
    expectBottomNavPinned(transitions);
  });

  test("a type filter swaps the results in place: no slide, no tiles flying", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/movimientos");
    await expect(movementRows(page).first()).toBeVisible();
    await skipWithoutViewTransitions(page);
    await settle(page);
    const readLog = await recordViewTransitions(page);
    await page
      .getByRole("navigation", { name: "Filtrar por tipo" })
      .getByRole("link", { name: "Recibido", exact: true })
      .click();
    await expect(page).toHaveURL(/type=recibido/);
    const transitions = await readLog({ className: "reveal" });

    expect(slideDurations(transitions)).toEqual([]);
    expect(
      allAnimations(transitions).filter(({ pseudo }) =>
        pseudo.includes("(movement-tile-"),
      ),
    ).toEqual([]);
  });

  test("taps during a transition still land and navigate", async ({ page }) => {
    await login(page);
    await skipWithoutViewTransitions(page);
    await settle(page);
    const nav = mainNav(page);
    const center = async (name: string) => {
      const box = await nav.getByRole("link", { name }).boundingBox();
      return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
    };
    const movements = await center("Movimientos");
    const home = await center("Inicio");

    // Three taps in quick succession, each while the previous transition still runs.
    await page.mouse.click(movements.x, movements.y);
    await page.waitForTimeout(120);
    await page.mouse.click(home.x, home.y);
    await page.waitForTimeout(120);
    await page.mouse.click(movements.x, movements.y);

    await expect(page).toHaveURL(/\/movimientos$/);
    await expect(movementRows(page).first()).toBeVisible();
    await expect(
      nav.getByRole("link", { name: "Movimientos" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("a cold load plays the branded intro, which never blocks and leaves by itself", async ({
    page,
  }) => {
    await login(page);
    await watchIntro(page);
    await page.goto("/");
    const seen = await introSeen(page);

    expect(seen).not.toBeNull();
    // Taps go through it, and CSS alone dissolves it within ~600ms of its first paint.
    expect(seen!.pointerEvents).toBe("none");
    expect(seen!.endMs).toBeGreaterThan(0);
    expect(seen!.endMs).toBeLessThanOrEqual(600);
    // Once dissolved it unmounts, and client navigations never bring it back.
    const intro = page.getByTestId("brand-intro");
    await expect(intro).toHaveCount(0);
    await mainNav(page).getByRole("link", { name: "Movimientos" }).click();
    await expect(movementRows(page).first()).toBeVisible();
    await expect(intro).toHaveCount(0);
  });
});

test.describe("with prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("push, pop and tab switches are instant (no duration, no delay)", async ({
    page,
  }) => {
    await login(page);
    const push = await pushFirstDetail(page);

    await settle(page);
    let readLog = await recordViewTransitions(page);
    await page.getByRole("link", { name: "Volver" }).click();
    await expect(movementRows(page).first()).toBeVisible();
    const pop = await readLog({ className: "nav-pop-in" });

    await settle(page);
    readLog = await recordViewTransitions(page);
    await mainNav(page).getByRole("link", { name: "Inicio" }).click();
    await expect(page).toHaveURL(/\/$/);
    const tab = await readLog({ className: "nav-tab-in" });

    for (const transitions of [push, pop, tab]) {
      expect(transitions.length).toBeGreaterThan(0);
      for (const { longestMs, latestEndMs } of transitions) {
        expect(longestMs).toBe(0);
        expect(latestEndMs).toBe(0);
      }
    }
  });

  test("a cold load skips the branded intro", async ({ page }) => {
    await login(page);
    await watchIntro(page);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Últimos movimientos" }),
    ).toBeVisible();
    // Hidden by CSS from its very first paint, then dropped once React hydrates.
    const seen = await introSeen(page);
    if (seen) expect(seen.display).toBe("none");
    await expect(page.getByTestId("brand-intro")).toHaveCount(0);
  });
});
