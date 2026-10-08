"use client";

import { RouteError, type RouteErrorProps } from "@/shared/ui/RouteError";

/** Error boundary of the signed-in area. The bottom nav (layout) stays usable around it. */
export default function AccountError(props: RouteErrorProps) {
  return <RouteError title="No pudimos cargar tu cuenta" {...props} />;
}
