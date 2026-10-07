import { expect, test, type Page } from "@playwright/test";

import { login } from "./fixtures/session";
import { waitForScreenToSettle } from "./fixtures/view-transitions";

/*
 * Home builds itself once when the app opens (jsdom runs no CSS animations): behind the
 * brand intro's hand-off, the card deck rises and settles, then the quick actions, then
 * the latest movements cascade in. A return to Home shows it settled.
 *
 * The order and the timing are read from the animations' own timelines (when each one
 * really starts and ends on the document's clock), not from sampled frames: a busy
 * machine drops frames, but never reorders a timeline.
 */

/** One frame of the entrance, as the screen shows it. */
type Frame = {
  /** The intro overlay's opacity; null once it is gone. */
  intro: number | null;
  card: number;
  cardRise: number;
  cardScale: number;
};

/** Where an entrance animation starts and ends on the document's timeline (ms). */
type Span = { start: number; end: number };

type Recording = {
  frames: Frame[];
  /** By part: `card`, `actions`, `row0`, `row1`…, and the intro's `dissolve`. */
  spans: Record<string, Span>;
};

/** Records the next page load, from its first script until Home has entered. */
async function recordEntrance(page: Page) {
  await page.addInitScript(() => {
    const frames: unknown[] = [];
    const spans: Record<string, unknown> = {};
    const recording = { frames, spans, done: false };
    Object.assign(window, { homeEntrance: recording });
    // A streamed page first lands in a hidden container: only the copy on screen counts.
    const onScreen = (element: Element) => element.getClientRects().length > 0;
    const partOf = (element: Element) => {
      if (element.matches(".brand-intro")) return "dissolve";
      if (element.matches(".home-enter-card")) return "card";
      if (element.matches(".home-enter-actions")) return "actions";
      const rows = [...document.querySelectorAll(".home-enter-rows li")].filter(
        onScreen,
      );
      return `row${rows.indexOf(element)}`;
    };
    const sample = () => {
      // The latest timing wins: the entrance is re-timed once, to follow the intro.
      for (const animation of document.getAnimations() as CSSAnimation[]) {
        const name = animation.animationName;
        const intro = name === "brand-intro-dissolve";
        if (!intro && !name?.startsWith("home-enter")) continue;
        const target = (animation.effect as KeyframeEffect | null)?.target;
        if (!target || animation.startTime === null) continue;
        if (!intro && !onScreen(target)) continue;
        const timing = animation.effect!.getComputedTiming();
        const start = Number(animation.startTime) + Number(timing.delay);
        spans[partOf(target)] = { start, end: start + Number(timing.duration) };
      }
      const card = [...document.querySelectorAll(".home-enter-card")].find(
        onScreen,
      );
      const intro = document.querySelector(".brand-intro");
      const style = card ? getComputedStyle(card) : null;
      frames.push({
        intro: intro ? Number(getComputedStyle(intro).opacity) : null,
        card: style ? Number(style.opacity) : 0,
        cardRise:
          style && style.translate !== "none"
            ? parseFloat(style.translate.split(" ")[1] ?? "0")
            : 0,
        cardScale:
          style && style.scale !== "none" ? parseFloat(style.scale) : 1,
      });
      // One frame past the end, so the last one shows Home at rest.
      if (recording.done) return;
      recording.done =
        document.documentElement.hasAttribute("data-home-entered");
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function recorded(page: Page): Promise<Recording> {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as unknown as { homeEntrance: { done: boolean } })
              .homeEntrance.done,
        ),
      { message: "Home finishes entering", timeout: 20_000 },
    )
    .toBe(true);
  return page.evaluate(
    () => (window as unknown as { homeEntrance: Recording }).homeEntrance,
  );
}

/**
 * Plays every animation at a tenth of its speed (DevTools' animation playback rate).
 * The entrance plays only behind the intro or with Home's own HTML: on a busy machine
 * the server can stream Home after the intro is gone, and Home then dissolves in with
 * its reveal instead. A slower intro keeps it in front until Home arrives; the timings
 * read from the timelines stay the nominal ones.
 */
async function slowAnimationsDown(page: Page) {
  const devtools = await page.context().newCDPSession(page);
  await devtools.send("Animation.enable");
  await devtools.send("Animation.setPlaybackRate", { playbackRate: 0.1 });
}

function homeEntranceAnimations(page: Page) {
  return page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((animation) =>
          (animation as CSSAnimation).animationName?.startsWith("home-enter"),
        ).length,
  );
}

test.describe("with motion allowed", () => {
  test.use({ reducedMotion: "no-preference" });

  test("a cold load builds Home behind the intro: the deck, then the actions, then the rows", async ({
    page,
  }) => {
    await login(page);
    await waitForScreenToSettle(page);
    await recordEntrance(page);
    await slowAnimationsDown(page);
    await page.reload();
    const { frames, spans } = await recorded(page);

    const { card, actions, row0, dissolve } = spans;
    expect(card, "the deck rises in").toBeDefined();
    expect(actions, "the quick actions follow").toBeDefined();
    expect(row0, "the rows cascade in").toBeDefined();
    // In order, each a beat after the one before (3 and 5 stagger steps of 40ms).
    expect(actions!.start - card!.start).toBeCloseTo(120, 0);
    expect(row0!.start - card!.start).toBeCloseTo(200, 0);
    const rows = Object.entries(spans)
      .filter(([part]) => /^row\d+$/.test(part))
      .map(([, span]) => span);
    expect(rows.length).toBeGreaterThan(1);
    // Built within 700ms of its start.
    const built = Math.max(card!.end, actions!.end, ...rows.map((r) => r.end));
    expect(built - card!.start).toBeLessThanOrEqual(700);
    // It never plays over the shield: it starts with the intro's hand-off, or after it.
    if (dissolve)
      expect(card!.start).toBeGreaterThanOrEqual(dissolve.start - 1);
    for (const frame of frames.filter((f) => f.intro === 1)) {
      expect(frame.card).toBeLessThan(0.05);
    }

    // The deck rose from below and grew into place, and rests there.
    expect(Math.max(...frames.map((f) => f.cardRise))).toBeGreaterThan(4);
    expect(Math.min(...frames.map((f) => f.cardScale))).toBeLessThan(0.99);
    expect(frames.at(-1)).toMatchObject({ card: 1, cardRise: 0, cardScale: 1 });
  });

  test("coming back to Home shows it settled: it builds once per app opening", async ({
    page,
  }) => {
    await login(page);
    await waitForScreenToSettle(page);
    await expect.poll(() => homeEntranceAnimations(page)).toBe(0);

    const nav = page.getByRole("navigation", { name: "Principal" });
    await nav.getByRole("link", { name: "Movimientos" }).click();
    await expect(page).toHaveURL(/\/movimientos$/);
    await nav.getByRole("link", { name: "Inicio" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator(".home-enter-card")).toBeVisible();

    expect(await homeEntranceAnimations(page)).toBe(0);
    await expect(page.locator(".home-enter-card")).toHaveCSS("opacity", "1");
  });
});

test.describe("with prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("Home is simply there: nothing travels or scales in", async ({
    page,
  }) => {
    await login(page);
    await waitForScreenToSettle(page);
    await recordEntrance(page);
    await page.reload();
    const { frames, spans } = await recorded(page);

    expect(frames.every((f) => f.cardRise === 0 && f.cardScale === 1)).toBe(
      true,
    );
    expect(Object.keys(spans)).toEqual([]);
  });
});
