/*
 * Navigation motion: the transition types a navigation carries (Link `transitionTypes`),
 * which tell every screen's `<ViewTransition>` (see ScreenTransition) how to move.
 * The direction is decided by the link, from the app's hierarchy, never guessed:
 *
 * - `nav-forward` (push): going deeper (list → detail, Home → Movimientos). The new screen
 *   slides in from the right over the old one, which shifts left and dims (iOS parallax).
 * - `nav-back` (pop): an in-app "Volver" up the hierarchy, the reverse of a push.
 * - `nav-tab`: switching sections in the bottom nav; a calm crossfade, no slide.
 * - `no-morph`: added to a push between sections (Home → Movimientos): the movement
 *   tiles both screens share stay in their screens instead of flying across, so the
 *   screen moves as one; a tab switch never morphs them either. On its own (`IN_PLACE`)
 *   it marks a new search or filter on the same screen: the results swap without tiles
 *   flying from the old rows to the new ones.
 * - `quick-action-open` / `quick-action-close`: a Home quick action growing into its
 *   screen and shrinking back (container transform, see QuickActionMorph); the screens
 *   themselves stay still so only the container moves.
 *
 * The browser's back button carries no type (React restores it on a sync lane without a
 * view transition), so it swaps instantly, as the platform does.
 */

export const NAV_FORWARD = "nav-forward";
export const NAV_BACK = "nav-back";
export const NAV_TAB = "nav-tab";
export const NO_MORPH = "no-morph";
export const QUICK_ACTION_OPEN = "quick-action-open";
export const QUICK_ACTION_CLOSE = "quick-action-close";

/** Ready-made `transitionTypes` values (stable arrays, so links never re-render for them). */
export const PUSH: string[] = [NAV_FORWARD];
export const SECTION_PUSH: string[] = [NAV_FORWARD, NO_MORPH];
/** Same screen, other results (search, type filter): the list swaps, nothing flies. */
export const IN_PLACE: string[] = [NO_MORPH];
export const POP: string[] = [NAV_BACK];
export const TAB_SWITCH: string[] = [NAV_TAB];
export const OPEN_QUICK_ACTION: string[] = [QUICK_ACTION_OPEN];
export const CLOSE_QUICK_ACTION: string[] = [QUICK_ACTION_CLOSE];

/**
 * View-transition classes per type, styled in globals.css. A screen that leaves takes the
 * `exit` class, the one that arrives the `enter` class; quick actions map to "none", so
 * the container transform is the only thing that moves.
 */
const TYPED_ENTER = {
  [NAV_FORWARD]: "nav-push-in",
  [NAV_BACK]: "nav-pop-in",
  [NAV_TAB]: "nav-tab-in",
  [QUICK_ACTION_OPEN]: "none",
  [QUICK_ACTION_CLOSE]: "none",
} as const;

const TYPED_EXIT = {
  [NAV_FORWARD]: "nav-push-out",
  [NAV_BACK]: "nav-pop-out",
  [NAV_TAB]: "nav-tab-out",
  [QUICK_ACTION_OPEN]: "none",
  [QUICK_ACTION_CLOSE]: "none",
} as const;

type ClassMap = Readonly<Record<string, string>>;

/** The class `map` gives the first of `types` it knows, if any. */
export function classForTypes(map: ClassMap, types: readonly string[]) {
  for (const type of types) {
    if (type in map) return map[type];
  }
  return undefined;
}

/**
 * `className` in the browser, "none" while server-rendering. A streamed page's sections
 * are revealed by React's server runtime, which animates them with a view transition
 * when they carry an enter or exit class; that reveal held a cold load's content back
 * (~80ms of LCP on a throttled phone). The first paint never animates: only reveals and
 * navigations after hydration do.
 */
function onClient(className: string) {
  return typeof window === "undefined" ? "none" : className;
}

/** A class map whose untyped default is `className`, only in the browser. */
export function clientOnly(className: string) {
  return {
    get default() {
      return onClient(className);
    },
  };
}

/**
 * Classes of a screen (`placeholder`: its loading.tsx skeleton) for React's `enter` and
 * `exit` props. React picks the class of the navigation's type; `default` is what it
 * uses for a commit without types:
 * - a Suspense reveal: the content dissolves in and rises a little (`reveal`) while its
 *   skeleton fades out (`skeleton-out`); a redirect (login → Home) reveals too;
 * - a navigation whose types React lost: the classes its announced types give (see
 *   below), so the motion does not depend on them arriving.
 * `default` is a getter: React reads it when it commits, so it sees the navigation in
 * progress then, even on a screen that rendered long before (the one leaving). On the
 * server it is "none" (see `clientOnly`).
 */
export function screenTransition({
  placeholder,
  types = currentNavigationTypes,
}: {
  placeholder: boolean;
  types?: () => readonly string[];
}) {
  return {
    enter: {
      ...TYPED_ENTER,
      get default() {
        return onClient(
          classForTypes(TYPED_ENTER, types()) ??
            (placeholder ? "none" : "reveal"),
        );
      },
    },
    exit: {
      ...TYPED_EXIT,
      get default() {
        return onClient(
          classForTypes(TYPED_EXIT, types()) ??
            (placeholder ? "skeleton-out" : "none"),
        );
      },
    },
  };
}

/*
 * Announced navigation: a fallback for transition types React drops.
 *
 * React queues transition types on the root, not on the navigation: the next transition
 * it commits takes them. When the navigation must fetch (a screen not prefetched) and
 * something else commits meanwhile (a streamed section landing, a Suspense retry), that
 * commit takes the types and the navigation arrives untyped. So links also announce
 * their types here when tapped (MotionLink), and the screens and shared tiles read them
 * as their untyped default, when React commits (a getter, see `screenTransition`). It is
 * a plain value, never a subscription: announcing re-renders nothing, so it can never
 * disturb a running transition. It is cleared once a screen mounts (the navigation
 * landed), or after a while if it never does. Server renders always see none.
 */
const NO_TYPES: readonly string[] = [];
const ANNOUNCEMENT_TTL_MS = 4_000;
let announced: readonly string[] = NO_TYPES;
let expiry: ReturnType<typeof setTimeout> | undefined;

/** A navigation with these transition types is starting (from a tap or the router). */
export function announceNavigation(types: readonly string[]) {
  clearTimeout(expiry);
  announced = types;
  expiry = setTimeout(settleNavigation, ANNOUNCEMENT_TTL_MS);
}

/** The announced navigation has landed (a screen mounted). */
export function settleNavigation() {
  clearTimeout(expiry);
  announced = NO_TYPES;
}

export function currentNavigationTypes(): readonly string[] {
  return typeof window === "undefined" ? NO_TYPES : announced;
}

/** View-transition names of the chrome that stays put while screens move. */
export const PINNED_CHROME = {
  header: "screen-header",
  bottomNav: "bottom-nav",
} as const;
