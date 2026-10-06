import Link from "next/link";

import { ChevronLeftIcon } from "@/shared/ui/icons";

/**
 * A real link (not `history.back()`): works on a fresh tab or a shared URL too.
 * `prefetch` loads the whole destination (not only its loading skeleton) while the detail
 * is open, so "Volver" lands in a single commit: the list appears at once and the type
 * tile can morph back into its row (a page that first shows a skeleton cannot pair it).
 */
export function BackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      prefetch
      className="inline-flex h-10 pressable items-center gap-1 self-start rounded-2xl bg-surface pr-4 pl-2.5 text-sm font-medium text-foreground shadow-card hover:text-primary focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
    >
      <ChevronLeftIcon className="size-5" />
      Volver
    </Link>
  );
}
