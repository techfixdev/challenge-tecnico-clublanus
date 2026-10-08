import { expect, test } from "@playwright/test";

import { auditLayout } from "./layout-audit";
import { flick } from "./pointer";

/*
 * The shared fixtures checked on their own, on bare pages: every spec trusts what they
 * report, so a fixture that stops seeing a problem would pass everything quietly.
 */

test.describe("auditLayout", () => {
  test("catches content sticking out past a plain horizontal clip", async ({
    page,
  }) => {
    // `overflow-x: hidden` alone computes `overflow-y` to auto: an ordinary page wrapper.
    await page.setContent(`
      <div style="overflow-x: hidden">
        <p style="width: 2000px">Demasiado ancho</p>
      </div>`);

    const { problems } = await auditLayout(page);

    expect(problems).toContainEqual(
      expect.stringMatching(/^sticks out to 2\d{3}px: <p>/),
    );
  });

  test("lets a dragged strip's tiles extend past its viewport", async ({
    page,
  }) => {
    await page.setContent(`
      <div data-gesture-viewport style="overflow: hidden">
        <p style="width: 2000px">Fuera de pantalla</p>
      </div>`);

    expect((await auditLayout(page)).problems).toEqual([]);
  });
});

test.describe("flick", () => {
  test("stamps its events one frame apart, however fast they are delivered", async ({
    page,
  }) => {
    await page.setContent(
      `<div id="pad" style="position: fixed; inset: 0"></div>`,
    );
    await page.evaluate(() => {
      const times: number[] = [];
      Object.assign(window, { times });
      const pad = document.getElementById("pad")!;
      for (const type of ["pointerdown", "pointermove", "pointerup"]) {
        pad.addEventListener(type, (event) => times.push(event.timeStamp));
      }
    });

    await flick(page, { x: 100, y: 100 }, { x: 160, y: 100 });

    const times = await page.evaluate(
      () => (window as unknown as { times: number[] }).times,
    );
    // Press, three moves, release: what the gesture hooks read their velocity from.
    expect(times).toHaveLength(5);
    for (const [index, time] of times.slice(1).entries()) {
      expect(time - times[index]!).toBeCloseTo(1000 / 60, 0);
    }
  });
});
