"use client";

import { useEffect } from "react";

import { ErrorState } from "@/shared/ui/ErrorState";

/** Covers the list and the detail. `retry` re-fetches the segment from the server. */
export default function MovementsError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState title="No pudimos cargar tus movimientos" onRetry={retry} />
  );
}
