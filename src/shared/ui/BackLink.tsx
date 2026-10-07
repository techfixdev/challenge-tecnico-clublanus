import { BACK_CONTROL_CLASSES } from "./back-control";
import { ChevronLeftIcon } from "./icons";
import { POP } from "./motion/navigation";
import { MotionLink } from "./motion/MotionLink";

/**
 * A real link (not `history.back()`): works on a fresh tab or a shared URL too.
 * `prefetch` loads the whole destination (not only its loading skeleton) while the detail
 * is open, so "Volver" lands in a single commit: the list appears at once and the type
 * tile can morph back into its row (a page that first shows a skeleton cannot pair it).
 *
 * It pops by default (`nav-back`: this screen slides out to the right); a quick action's
 * screen passes `quick-action-close` instead, to shrink back into its Home tile.
 */
export function BackLink({
  href,
  transitionTypes = POP,
}: {
  href: string;
  transitionTypes?: string[];
}) {
  return (
    <MotionLink
      href={href}
      prefetch
      transitionTypes={transitionTypes}
      className={BACK_CONTROL_CLASSES}
    >
      <ChevronLeftIcon className="size-5" />
      Volver
    </MotionLink>
  );
}
