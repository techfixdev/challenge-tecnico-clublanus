"use client";

import { ViewTransition, type ReactNode } from "react";

import {
  classForTypes,
  currentNavigationTypes,
  NAV_TAB,
  NO_MORPH,
} from "@/shared/ui/motion/navigation";

import { movementTileTransitionName } from "./movement-motion";

/**
 * The morph runs between a row and its detail (and back), on top of the push or pop.
 * Between sections (Home ↔ Movimientos) the same tiles are on both screens, but there
 * the screen moves as one, so they do not fly across it.
 */
const NO_TILE_MORPH = { [NAV_TAB]: "none", [NO_MORPH]: "none" };

/** Read when React commits (a getter): the announced navigation, if its types were lost. */
const TILE_SHARE = {
  ...NO_TILE_MORPH,
  get default() {
    return (
      classForTypes(NO_TILE_MORPH, currentNavigationTypes()) ?? "movement-morph"
    );
  },
};

/**
 * Marks a movement's type tile as a shared element (React `<ViewTransition>`, built into
 * the Next App Router). When a navigation shows the same movement's tile on the next page,
 * the browser morphs it from its old box to the new one: row → detail header, and back
 * through "Volver" (see NavBar). The browser's back button swaps without a morph:
 * React restores that history entry on a sync lane, where it starts no view transition.
 *
 * - `share`: the class of that morph, timed in globals.css (`.movement-morph`); none on
 *   tab switches, section pushes and in-place filters (`NO_TILE_MORPH`, also when React
 *   dropped those types: the announced navigation decides then, see navigation.ts).
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
      share={TILE_SHARE}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
