"use client";

import { RouteError, type RouteErrorProps } from "@/shared/ui/RouteError";

export default function ReceiveError(props: RouteErrorProps) {
  return <RouteError title="No pudimos cargar tus datos" {...props} />;
}
