import { expect, test, type Page, type Request } from "@playwright/test";

/*
 * Records the view transitions a page starts (React `<ViewTransition>` on navigation),
 * with every animation the browser runs on their pseudo-elements, from real computed
 * timing (jsdom has no CSS). Shared by the motion specs.
 */

/** One animation on a `::view-transition-*` pseudo-element. */
export type PseudoAnimation = {
  /** e.g. `::view-transition-new(bottom-nav)`. */
  pseudo: string;
  /** The CSS keyframes name, e.g. `nav-slide-from-edge`. */
  name: string;
  durationMs: number;
  /** When it ends, delay included. */
  endMs: number;
};

export type TransitionEntry = {
  names: string[];
  /** `longestMs`: longest duration; `latestEndMs`: when the last one ends (delay included). */
  longestMs: number;
  latestEndMs: number;
  animations: PseudoAnimation[];
  /** The transition's types (Link `transitionTypes`), e.g. `["nav-forward"]`. */
  types: string[];
  /** Skipped before it animated (a newer transition replaced it): nothing ran. */
  skipped?: boolean;
  /** View-transition classes of the participating elements by name, before the update. */
  oldClasses: Record<string, string>;
  /** The same once the new state is in place (`ready`). */
  newClasses: Record<string, string>;
};

type TransitionLog = { started: number; entries: TransitionEntry[] };

/**
 * The transitions need the View Transitions API. Browsers without it navigate with an
 * instant swap (no animation to assert), so the transition checks skip there.
 */
export async function skipWithoutViewTransitions(page: Page) {
  const supported = await page.evaluate(
    () => typeof document.startViewTransition === "function",
  );
  test.skip(
    !supported,
    "No View Transitions API: navigation falls back to an instant swap",
  );
}

/**
 * Waits until no view transition runs. While a screen moves in (push, pop, a reveal after
 * login) it does not take taps or drags, like on iOS: the browser does not hit-test
 * elements that are being animated by a view transition. Gestures right after a
 * navigation wait for this first.
 */
export async function waitForScreenToSettle(page: Page) {
  await page.waitForFunction(
    () =>
      (document as Document & { activeViewTransition?: unknown })
        .activeViewTransition == null,
  );
}

/** Requests in flight per page, with when each started. */
const inFlight = new WeakMap<Page, Map<Request, number>>();

/** Starts counting the page's requests in flight (call before navigating). */
export function trackNetwork(page: Page) {
  let requests = inFlight.get(page);
  if (!requests) {
    const tracked = new Map<Request, number>();
    page.on("request", (request) => tracked.set(request, Date.now()));
    page.on("requestfinished", (request) => tracked.delete(request));
    page.on("requestfailed", (request) => tracked.delete(request));
    inFlight.set(page, tracked);
    requests = tracked;
  }
  return requests;
}

/** A request open this long is a long-lived one (a held stream), not part of a load. */
const LONG_LIVED_MS = 3_000;
const QUIET_MS = 300;

/**
 * Waits until the screen is complete: no recent request still loading (streamed sections,
 * prefetches) for a short while, and no view transition running. A navigation's
 * transition types belong to the next transition React commits, so a streamed section
 * landing between a tap and its navigation would take them (a React limitation): taps
 * whose motion a test asserts wait for this first.
 */
export async function settle(page: Page) {
  const requests = trackNetwork(page);
  const loading = () => {
    const now = Date.now();
    return [...requests.values()].some(
      (started) => now - started < LONG_LIVED_MS,
    );
  };
  await expect
    .poll(
      async () => {
        if (loading()) return false;
        await page.waitForTimeout(QUIET_MS);
        return !loading();
      },
      { message: "the network goes quiet", timeout: 15_000 },
    )
    .toBe(true);
  await waitForScreenToSettle(page);
}

/**
 * Records every view transition the page starts. Install before the navigation, then
 * call the returned function after it: it waits until a transition started and every
 * started one has been logged (`ready` resolves a frame after the commit), instead of a
 * fixed sleep.
 */
export async function recordViewTransitions(page: Page) {
  await page.evaluate(() => {
    const log: TransitionLog = { started: 0, entries: [] };
    Object.assign(window, { viewTransitionLog: log });
    const start = document.startViewTransition.bind(document);
    const classesNow = () => {
      const classes: Record<string, string> = {};
      for (const element of document.querySelectorAll<HTMLElement>("*")) {
        const style = getComputedStyle(element) as CSSStyleDeclaration & {
          viewTransitionClass?: string;
        };
        const name = style.viewTransitionName;
        if (name && name !== "none") {
          classes[name] = style.viewTransitionClass ?? "";
        }
      }
      return classes;
    };
    document.startViewTransition = ((
      arg?: ViewTransitionUpdateCallback | StartViewTransitionOptions,
    ) => {
      let oldClasses: Record<string, string> = {};
      const options = typeof arg === "function" ? { update: arg } : (arg ?? {});
      const wrapped = {
        ...options,
        update: () => {
          // The old state is still in the DOM: React has named and classed it.
          oldClasses = classesNow();
          return options.update?.();
        },
      };
      const transition = start(
        typeof arg === "function" ? wrapped.update : wrapped,
      );
      log.started += 1;
      const typesOf = () => {
        const types = (transition as { types?: Set<string> }).types;
        return types ? [...types] : [];
      };
      transition.ready.then(
        () => {
          const animations = document.getAnimations().flatMap((animation) => {
            const effect = animation.effect as KeyframeEffect | null;
            const pseudo = effect?.pseudoElement ?? "";
            if (!pseudo.startsWith("::view-transition")) return [];
            const timing = effect!.getComputedTiming();
            return [
              {
                pseudo,
                name: (animation as CSSAnimation).animationName ?? "",
                durationMs: Number(timing.duration ?? 0),
                endMs: Number(timing.endTime ?? 0),
              },
            ];
          });
          log.entries.push({
            names: animations.map(({ pseudo }) => pseudo),
            longestMs: Math.max(0, ...animations.map((a) => a.durationMs)),
            latestEndMs: Math.max(0, ...animations.map((a) => a.endMs)),
            animations,
            types: typesOf(),
            oldClasses,
            newClasses: classesNow(),
          });
        },
        () => {
          // Skipped before it animated: still logged, so the wait below never hangs on it.
          log.entries.push({
            names: [],
            longestMs: 0,
            latestEndMs: 0,
            animations: [],
            types: typesOf(),
            skipped: true,
            oldClasses,
            newClasses: {},
          });
        },
      );
      return transition;
    }) as typeof document.startViewTransition;
  });
  /**
   * `type` / `className`: wait for a transition of that type, or one where an element
   * took that view-transition class (an unrelated transition, such as a Suspense reveal
   * that lands meanwhile, may be logged first). React may drop a navigation's types (see
   * shared/ui/motion/navigation.ts), so motion is better matched by its class.
   */
  return async ({
    timeout,
    type,
    className,
  }: { timeout?: number; type?: string; className?: string } = {}) => {
    const wait = page.waitForFunction(
      ([wantedType, wantedClass]) => {
        const log = (window as unknown as { viewTransitionLog: TransitionLog })
          .viewTransitionLog;
        const complete = log.started > 0 && log.entries.length === log.started;
        const hasClass = (classes: Record<string, string>) =>
          Object.values(classes).some((value) =>
            value.split(/\s+/).includes(wantedClass!),
          );
        const matched =
          (!wantedType && !wantedClass) ||
          log.entries.some(
            ({ types, oldClasses, newClasses }) =>
              (wantedType !== undefined && types.includes(wantedType)) ||
              (wantedClass !== undefined &&
                (hasClass(oldClasses) || hasClass(newClasses))),
          );
        return complete && matched ? log.entries : null;
      },
      [type, className] as const,
      { timeout: timeout ?? (type || className ? 10_000 : undefined) },
    );
    if (!type && !className)
      return (await (await wait).jsonValue()) as TransitionEntry[];
    try {
      return (await (await wait).jsonValue()) as TransitionEntry[];
    } catch (error) {
      // Say what did run instead: far more useful than a bare timeout.
      const seen = await page.evaluate(() => {
        const log = (window as unknown as { viewTransitionLog: TransitionLog })
          .viewTransitionLog;
        return {
          started: log.started,
          entries: log.entries.map(({ types, skipped, animations }) => ({
            types,
            skipped: Boolean(skipped),
            animations: animations.map(
              ({ pseudo, name }) => `${pseudo} ${name}`,
            ),
          })),
        };
      });
      throw new Error(
        `No "${type ?? className}" view transition was logged: ${JSON.stringify(seen)}`,
        { cause: error },
      );
    }
  };
}

/** Every pseudo-element animation of the recorded transitions. */
export function allAnimations(transitions: TransitionEntry[]) {
  return transitions.flatMap(({ animations }) => animations);
}

/** Animations on the old (`old`) or new (`new`) images of elements with `className`. */
export function animationsOf(
  transitions: TransitionEntry[],
  side: "old" | "new",
  className: string,
) {
  return transitions.flatMap(({ animations, oldClasses, newClasses }) => {
    const classes = side === "old" ? oldClasses : newClasses;
    return animations.filter(({ pseudo }) => {
      const match = pseudo.match(/^::view-transition-(old|new)\((.+)\)$/);
      if (!match || match[1] !== side) return false;
      return (classes[match[2]!] ?? "").split(/\s+/).includes(className);
    });
  });
}

/** Keyframes run on the old (`old`) or new (`new`) images of elements with `className`. */
export function keyframesOf(
  transitions: TransitionEntry[],
  side: "old" | "new",
  className: string,
) {
  return new Set(
    animationsOf(transitions, side, className).map(({ name }) => name),
  );
}

/**
 * The detail's full prefetch of the list (`<Link prefetch>` on "Volver"), as observed on
 * `next start`: an RSC request (`rsc: 1`) for `/movimientos` sent from a detail page
 * (`next-url: /movimientos/<id>`) without `next-router-prefetch` (that header marks the
 * partial, loading-only prefetch, which also goes out and carries no list).
 */
export function isFullPrefetch(
  request: Request,
  pathname: string,
  fromPrefix: string,
) {
  const url = new URL(request.url());
  const headers = request.headers();
  return (
    url.pathname === pathname &&
    url.searchParams.has("_rsc") &&
    headers.rsc === "1" &&
    !("next-router-prefetch" in headers) &&
    (headers["next-url"] ?? "/").startsWith(fromPrefix)
  );
}

/**
 * Watches a full prefetch from before it starts. The router reads what it needs from the
 * stream and then cancels it, so it may end as "failed" (`net::ERR_ABORTED`) rather than
 * "finished": both mean the page is in the router cache. `done()` resolves once it is
 * over; if none started (the cache was fresh enough), after a short quiet period.
 */
export function watchPrefetch(
  page: Page,
  matches: (request: Request) => boolean,
) {
  let started = false;
  let ended = false;
  const onStart = (request: Request) => {
    if (matches(request)) started = true;
  };
  const onEnd = (request: Request) => {
    if (matches(request)) ended = true;
  };
  page.on("request", onStart);
  page.on("requestfinished", onEnd);
  page.on("requestfailed", onEnd);
  return {
    async done() {
      // Usually already started by now. If not, one quiet second for the router to start it.
      if (!started) await page.waitForTimeout(1_000);
      if (started) {
        await expect
          .poll(() => ended, { message: "the prefetch ends" })
          .toBe(true);
      }
      page.off("request", onStart);
      page.off("requestfinished", onEnd);
      page.off("requestfailed", onEnd);
    },
  };
}
