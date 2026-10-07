import type { Page } from "@playwright/test";

/** One frame at 60 Hz, in seconds: the spacing of a flick's events. */
const FRAME_S = 1 / 60;

type Point = { x: number; y: number };

/**
 * A quick flick with the mouse from `from` to `to`: pressed, moved in `moves` equal steps
 * and lifted, one frame apart. The events carry those times themselves (CDP's
 * `timestamp`, which becomes each event's `timeStamp`), so the throw's velocity is the
 * same however long the browser or the test runner takes to deliver them. With
 * `page.mouse`, a loaded machine stretches a flick into a slow drag.
 */
export async function flick(page: Page, from: Point, to: Point, moves = 3) {
  const cdp = await page.context().newCDPSession(page);
  const start = Date.now() / 1000;
  const at = (step: number) => ({
    x: from.x + ((to.x - from.x) * step) / moves,
    y: from.y + ((to.y - from.y) * step) / moves,
  });
  type MouseEvent = {
    type: "mousePressed" | "mouseMoved" | "mouseReleased";
  } & Point;
  const events: MouseEvent[] = [
    { type: "mousePressed", ...from },
    ...Array.from({ length: moves }, (_, step): MouseEvent => ({
      type: "mouseMoved",
      ...at(step + 1),
    })),
    { type: "mouseReleased", ...to },
  ];
  for (const [index, { type, x, y }] of events.entries()) {
    await cdp.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: "left",
      buttons: type === "mouseReleased" ? 0 : 1,
      clickCount: 1,
      timestamp: start + index * FRAME_S,
    });
  }
  await cdp.detach();
}
