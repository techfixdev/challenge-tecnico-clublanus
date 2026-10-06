import { expect, test, type Locator, type Page } from "@playwright/test";

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

/**
 * The morph needs the View Transitions API. Browsers without it navigate with an instant
 * swap (no animation to assert), so the transition checks skip there with that reason.
 */
async function skipWithoutViewTransitions(page: Page) {
  const supported = await page.evaluate(
    () => typeof document.startViewTransition === "function",
  );
  test.skip(
    !supported,
    "No View Transitions API: navigation falls back to an instant swap",
  );
}

type TransitionLog = {
  started: number;
  entries: { names: string[]; longestMs: number }[];
};

/**
 * Records every view transition the page starts: the names of its pseudo-elements and
 * the longest animation. Install before the navigation, read after it.
 */
async function recordViewTransitions(page: Page) {
  await page.evaluate(() => {
    const log: TransitionLog = { started: 0, entries: [] };
    Object.assign(window, { viewTransitionLog: log });
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((update: ViewTransitionUpdateCallback) => {
      const transition = start(update);
      log.started += 1;
      transition.ready.then(() => {
        const animations = document
          .getAnimations()
          .filter((animation) =>
            (
              animation.effect as KeyframeEffect | null
            )?.pseudoElement?.startsWith("::view-transition"),
          );
        log.entries.push({
          names: animations.map(
            (animation) =>
              (animation.effect as KeyframeEffect).pseudoElement ?? "",
          ),
          longestMs: Math.max(
            0,
            ...animations.map((animation) =>
              Number(animation.effect?.getComputedTiming().duration ?? 0),
            ),
          ),
        });
      });
      return transition;
    }) as typeof document.startViewTransition;
  });
  return async ({ timeout }: { timeout?: number } = {}) => {
    // `ready` resolves a frame after the navigation commits: wait until a transition
    // started and every started one has been logged, instead of a fixed sleep.
    const handle = await page.waitForFunction(
      () => {
        const log = (window as unknown as { viewTransitionLog: TransitionLog })
          .viewTransitionLog;
        return log.started > 0 && log.entries.length === log.started
          ? log.entries
          : null;
      },
      undefined,
      { timeout },
    );
    return (await handle.jsonValue()) as TransitionLog["entries"];
  };
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

/** Names of the movement tiles that morphed during the recorded transitions. */
function tileMorphs(transitions: TransitionLog["entries"]) {
  return new Set(
    transitions
      .flatMap(({ names }) => names)
      .filter((name) =>
        name.startsWith("::view-transition-group(movement-tile"),
      ),
  );
}

/** Leaves the detail ("Volver" or the browser's back) and returns the transitions it started. */
async function backToList(
  page: Page,
  via: "link" | "history",
  { timeout }: { timeout?: number } = {},
) {
  const readLog = await recordViewTransitions(page);
  if (via === "link") await page.getByRole("link", { name: "Volver" }).click();
  else await page.goBack();
  await expect(movementRows(page).first()).toBeVisible();
  return readLog({ timeout });
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
    const { id } = await openFirstDetail(page);
    const transitions = await backToList(page, "link");
    expect(tileMorphs(transitions)).toEqual(
      new Set([`::view-transition-group(movement-tile-${id})`]),
    );
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
    await expect(
      backToList(page, "history", { timeout: 5_000 }),
    ).rejects.toThrow(/waitForFunction: Timeout 5000ms exceeded/);
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
});
