import { expect, test, type Page } from "@playwright/test";

import { movementRows, recipientSearch } from "./fixtures/screens";
import { login } from "./fixtures/session";
import { waitForScreenToSettle } from "./fixtures/view-transitions";

/*
 * Text pasted into the movements search must always search, whenever it lands. The send
 * flow's recipient search follows the same rule (its before-hydration case is below; no
 * view transition starts while it is on screen).
 *
 * React commits a view transition in two steps: it turns its event system off, asks the
 * browser for `startViewTransition`, and turns it back on only in the update callback,
 * once the browser has captured the old screen. An `input` event the browser delivers in
 * between never reaches React's `onChange` (measured: about 2 pastes in 100 under load,
 * while the month summary and the list reveal). These specs put the paste exactly there,
 * and before hydration, instead of waiting for the race.
 */

const ADOBE_MOVEMENTS = 2;

/**
 * Pastes `text` into the search box the next time React starts a view transition while
 * the box is on screen, right after React asked for it: React's events are
 * off until the browser runs the update callback.
 */
async function pasteDuringNextReveal(page: Page, text: string) {
  await page.evaluate((value) => {
    const state = { pasted: false };
    Object.assign(window, { revealPaste: state });
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((
      arg?: ViewTransitionUpdateCallback | StartViewTransitionOptions,
    ) => {
      const transition = start(arg);
      const input =
        document.querySelector<HTMLInputElement>("#movement-search");
      if (!state.pasted && input) {
        state.pasted = true;
        // What the browser does on a paste: the new value, then `input`.
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(input, value);
        input.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: "insertFromPaste",
            data: value,
          }),
        );
      }
      return transition;
    }) as typeof document.startViewTransition;
  }, text);
}

async function expectAdobeResults(page: Page, url = /\/movimientos\?q=adobe$/) {
  await expect(page).toHaveURL(url);
  await expect(page.getByRole("status")).toHaveText(
    `${ADOBE_MOVEMENTS} movimientos`,
  );
  await expect(movementRows(page)).toHaveCount(ADOBE_MOVEMENTS);
  for (const row of await movementRows(page).all()) {
    await expect(row).toContainText("Adobe");
  }
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("a paste that lands while the list moves still searches", async ({
  page,
}) => {
  await page.goto("/movimientos");
  await expect(movementRows(page)).not.toHaveCount(0);
  await waitForScreenToSettle(page);

  // A type chip swaps the list: its skeleton and then its rows move in with view
  // transitions, like the first reveal, while the search box stays on screen.
  await pasteDuringNextReveal(page, "adobe");
  await page
    .getByRole("navigation", { name: "Filtrar por tipo" })
    .getByRole("link", { name: "Débito Aut.", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { revealPaste: { pasted: boolean } })
            .revealPaste.pasted,
      ),
    )
    .toBe(true);

  await expectAdobeResults(page, /\/movimientos\?q=adobe&type=debito$/);
  await expect(
    page.getByRole("searchbox", { name: "Buscar movimientos" }),
  ).toHaveValue("adobe");
});

test("text typed before the page hydrates still searches", async ({ page }) => {
  // Holds the app's scripts (not its stylesheets, which block rendering) until the text
  // is in: the box is only the server's HTML.
  let releaseScripts!: () => void;
  const scriptsHeld = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  await page.route("**/_next/static/chunks/**/*.js", async (route) => {
    await scriptsHeld;
    await route.continue();
  });

  await page.goto("/movimientos", { waitUntil: "commit" });
  const search = page.getByRole("searchbox", { name: "Buscar movimientos" });
  await search.fill("adobe");
  releaseScripts();

  await expectAdobeResults(page);
  await expect(search).toHaveValue("adobe");
});

test("a recipient typed before the transfer screen hydrates still narrows the recents", async ({
  page,
}) => {
  // Same hold as above: the send flow's search is only the server's HTML.
  let releaseScripts!: () => void;
  const scriptsHeld = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  await page.route("**/_next/static/chunks/**/*.js", async (route) => {
    await scriptsHeld;
    await route.continue();
  });

  await page.goto("/transferir", { waitUntil: "commit" });
  const search = recipientSearch(page);
  await search.fill("matias");
  releaseScripts();

  // Matías Herrera matches and is chosen, and every recent left on the strip matches too.
  // No exact count: a mutating project shares this database and may add recents.
  const strip = page.getByRole("listbox", { name: "Recientes" });
  const options = strip.getByRole("option");
  const matching = strip.getByRole("option", { name: /mat[ií]as/i });
  await expect(
    strip.getByRole("option", { name: /Matías Herrera/ }),
  ).toHaveAttribute("aria-selected", "true");
  await expect
    .poll(async () => {
      const shown = await options.count();
      return shown > 0 && shown === (await matching.count());
    })
    .toBe(true);
  await expect(search).toHaveValue("matias");

  // Proof the text narrowed the strip: without it there are more recents. Had the text
  // typed before hydration been ignored, the poll above would never see only matches.
  const narrowed = await options.count();
  await search.fill("");
  await expect.poll(() => options.count()).toBeGreaterThan(narrowed);
});
