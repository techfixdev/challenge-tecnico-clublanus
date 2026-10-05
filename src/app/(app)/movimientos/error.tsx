"use client";

import { RouteError, type RouteErrorProps } from "@/shared/ui/RouteError";

/** Covers the list and the detail, so a failing query never takes the whole app down. */
export default function MovementsError(props: RouteErrorProps) {
  return <RouteError title="No pudimos cargar tus movimientos" {...props} />;
}
