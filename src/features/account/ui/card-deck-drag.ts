import type { MotionValue } from "motion/react";
import { createContext } from "react";

/**
 * Whether the card carousel is being dragged sideways, for the cards inside it: a card
 * that tilts under a pressed finger lets go of the tilt as soon as the drag takes the
 * gesture over (see LivingCard). `null` outside a carousel.
 */
export const DeckDraggingContext = createContext<MotionValue<boolean> | null>(
  null,
);
