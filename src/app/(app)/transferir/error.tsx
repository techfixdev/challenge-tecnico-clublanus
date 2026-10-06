"use client";

import { RouteError, type RouteErrorProps } from "@/shared/ui/RouteError";

/** A failed read (cards, recent recipients); a failed transfer is handled in the form. */
export default function TransferError(props: RouteErrorProps) {
  return <RouteError title="No pudimos abrir las transferencias" {...props} />;
}
