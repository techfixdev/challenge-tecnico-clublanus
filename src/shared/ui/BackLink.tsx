import Link from "next/link";

import { BACK_CONTROL_CLASSES } from "./back-control";
import { ChevronLeftIcon } from "./icons";

/**
 * A real link (not `history.back()`): works on a fresh tab or a shared URL too.
 * `prefetch` loads the whole destination (not only its loading skeleton) while the detail
 * is open, so "Volver" lands in a single commit: the list appears at once and the type
 * tile can morph back into its row (a page that first shows a skeleton cannot pair it).
 */
export function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} prefetch className={BACK_CONTROL_CLASSES}>
      <ChevronLeftIcon className="size-5" />
      Volver
    </Link>
  );
}
