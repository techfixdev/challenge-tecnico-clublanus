"use client";

import { ROUTES } from "@/shared/lib/routes";
import { BackLink } from "@/shared/ui/BackLink";
import { CLOSE_QUICK_ACTION } from "@/shared/ui/motion/navigation";
import { RouteError, type RouteErrorProps } from "@/shared/ui/RouteError";

/**
 * A failed read (cards, recent recipients); a failed transfer is handled in the form.
 * The send flow hides the bottom nav, so the error keeps a way back to Home.
 */
export default function TransferError(props: RouteErrorProps) {
  return (
    <div className="flex flex-col">
      <div className="px-6 pt-8">
        <BackLink href={ROUTES.home} transitionTypes={CLOSE_QUICK_ACTION} />
      </div>
      <RouteError title="No pudimos abrir las transferencias" {...props} />
    </div>
  );
}
