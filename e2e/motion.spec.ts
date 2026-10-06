import { expect, test, type Page } from "@playwright/test";

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
function rowAnimations(page: Page) {
  return movementRows(page).evaluateAll((rows) =>
    rows.map((row) => getComputedStyle(row).animationName),
  );
}

/**
 * Records every view transition the page starts: the names of its pseudo-elements and
 * the longest animation. Install before the navigation, read after it.
 */
async function recordViewTransitions(page: Page) {
  await page.evaluate(() => {
    const log: { names: string[]; longestMs: number }[] = [];
    Object.assign(window, { viewTransitionLog: log });
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((update: ViewTransitionUpdateCallback) => {
      const transition = start(update);
      transition.ready.then(() => {
        const animations = document
          .getAnimations()
          .filter((animation) =>
            (
              animation.effect as KeyframeEffect | null
            )?.pseudoElement?.startsWith("::view-transition"),
          );
        log.push({
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
  return async () => {
    // `ready` resolves a frame after the navigation commits.
    await page.waitForTimeout(400);
    return page.evaluate(
      () =>
        (
          window as unknown as {
            viewTransitionLog: { names: string[]; longestMs: number }[];
          }
        ).viewTransitionLog,
    );
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

/** Computed `scale` of the login button while it is held down (`:active`). */
async function pressedScale(page: Page) {
  const button = page.getByRole("button", { name: "Ingresar" });
  const box = await button.boundingBox();
  if (!box) throw new Error("The login button is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // Wait past the press transition, then read the settled value.
  await page.waitForTimeout(300);
  const scale = await button.evaluate(
    (element) => getComputedStyle(element).scale,
  );
  await page.mouse.up();
  return scale;
}

test.describe("with motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });

  test("skeletons shimmer and pressed buttons shrink", async ({ page }) => {
    await page.goto("/login");

    expect(await shimmerAnimation(page)).toBe("skeleton-shimmer");
    expect(await pressedScale(page)).toBe("0.97");
  });

  test("rows stagger in and the tapped tile morphs into the detail", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/movimientos");

    expect(new Set(await rowAnimations(page))).toEqual(new Set(["row-enter"]));

    const { id, transitions } = await openFirstDetail(page);
    // Only the tapped movement's tile is named, so exactly one pair morphs.
    const morphs = transitions
      .flatMap(({ names }) => names)
      .filter((name) =>
        name.startsWith("::view-transition-group(movement-tile"),
      );
    expect(new Set(morphs)).toEqual(
      new Set([`::view-transition-group(movement-tile-${id})`]),
    );
    expect(Math.max(...transitions.map((t) => t.longestMs))).toBeGreaterThan(0);
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

  test("rows appear at once and navigation does not animate", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/movimientos");

    expect(new Set(await rowAnimations(page))).toEqual(new Set(["none"]));

    const { transitions } = await openFirstDetail(page);
    // The transition still runs (state changes stay atomic), with zero-length animations.
    expect(transitions.length).toBeGreaterThan(0);
    for (const { longestMs } of transitions) expect(longestMs).toBe(0);
  });
});
