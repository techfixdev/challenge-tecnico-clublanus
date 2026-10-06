import { ViewTransition, type ReactNode } from "react";

/** View-transition names shared by a Home quick action and the screen it opens. */
export const QUICK_ACTION_MORPH = {
  transfer: "quick-action-transfer",
  receive: "quick-action-receive",
} as const;

/** Transition type the quick actions put on their navigation (Link `transitionTypes`). */
export const QUICK_ACTION_OPEN = "quick-action-open";

/**
 * Container transform between a Home quick action ("Enviar", "Recibir") and its screen:
 * the tile and the screen's `<main>` share a view-transition name, so the browser grows
 * the tile into the screen and, coming back through a link ("Volver"), shrinks the screen
 * into the tile. Both screens are fully prefetched from Home, so the pair exists in the
 * navigation's commit and the morph only covers the swap, never delays it.
 *
 * - `share`: opening (typed by the tile's link) and closing (any other link) use their
 *   own classes, timed and shaped in globals.css (`.container-open`, `.container-close`).
 * - `default="none"`: neither side animates on unrelated transitions.
 * The browser's back button swaps without a morph, as for the movement tile (React starts
 * no view transition on that sync update); reduced motion makes the morph instant.
 */
export function QuickActionMorph({
  name,
  children,
}: {
  name: (typeof QUICK_ACTION_MORPH)[keyof typeof QUICK_ACTION_MORPH];
  children: ReactNode;
}) {
  return (
    <ViewTransition
      name={name}
      share={{
        [QUICK_ACTION_OPEN]: "container-open",
        default: "container-close",
      }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
