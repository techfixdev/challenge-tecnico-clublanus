/*
 * List rows rise into place (the CSS `row-enter` stagger, see globals.css) only on the
 * page's first paint: the list "builds" once, when the app opens. After that, rows that
 * arrive (a filter, a search, "Cargar más") simply appear, as the content of a native
 * list does; replaying the entrance on every change reads as decoration.
 *
 * The first rows may enter before React hydrates (server-rendered) or after it (streamed
 * behind a skeleton), so the window closes once the first rows to enter have finished:
 * an attribute on <html> then turns the animation off for every row inserted later.
 * Closing earlier would cut the running entrances short.
 */

/** Attribute on <html> that turns the row entrance off (see `row-enter` in globals.css). */
export const ROW_ENTRANCE_CLOSED = "data-rows-entered";

let closing: Promise<void> | undefined;
let onStart: ((event: Event) => void) | undefined;

function rowEntrances(): Animation[] {
  if (typeof document.getAnimations !== "function") return [];
  return document
    .getAnimations()
    .filter(
      (animation) =>
        (animation as Partial<CSSAnimation>).animationName === "row-enter",
    );
}

/** Closes the row-entrance window once the first paint's rows have entered. Idempotent. */
export function closeRowEntranceWindow(): Promise<void> {
  closing ??= (async () => {
    await Promise.allSettled(
      rowEntrances().map((animation) => animation.finished),
    );
    document.documentElement.setAttribute(ROW_ENTRANCE_CLOSED, "");
  })();
  return closing;
}

/**
 * Closes the window after the first rows that enter: the ones entering now, or else the
 * first batch to start later (a list streamed in behind its skeleton). Idempotent.
 */
export function watchFirstRowEntrance() {
  if (closing || onStart) return;
  if (rowEntrances().length > 0) {
    void closeRowEntranceWindow();
    return;
  }
  onStart = (event) => {
    if ((event as AnimationEvent).animationName !== "row-enter") return;
    stopWatching();
    // The batch's later rows are already pending (their stagger delay): it waits for them.
    void closeRowEntranceWindow();
  };
  document.addEventListener("animationstart", onStart, true);
}

function stopWatching() {
  if (onStart) document.removeEventListener("animationstart", onStart, true);
  onStart = undefined;
}

/** Test helper: reopens the window (a fresh page load). */
export function resetRowEntranceWindowForTests() {
  stopWatching();
  closing = undefined;
  document.documentElement.removeAttribute(ROW_ENTRANCE_CLOSED);
}
