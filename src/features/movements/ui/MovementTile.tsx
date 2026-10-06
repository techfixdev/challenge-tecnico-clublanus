import { ViewTransition, type ReactNode } from "react";

import { movementTileTransitionName } from "./movement-motion";

/**
 * Marks a movement's type tile as a shared element (React `<ViewTransition>`, built into
 * the Next App Router). When a navigation shows the same movement's tile on the next page,
 * the browser morphs it from its old box to the new one: row → detail header, and back.
 *
 * - `share`: the class of that morph, timed in globals.css (`.movement-morph`).
 * - `default="none"`: the tile does not crossfade on unrelated transitions (search,
 *   filters), only when its pair exists on both sides.
 * Browsers without the View Transitions API simply navigate, with no animation.
 */
export function MovementTile({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <ViewTransition
      name={movementTileTransitionName(id)}
      share="movement-morph"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
