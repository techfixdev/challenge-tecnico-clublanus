"use client";

import { useEffect } from "react";

import { ErrorState } from "@/shared/ui/ErrorState";

/** Error boundary of the signed-in area. The bottom nav (layout) stays usable around it. */
export default function AccountError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Server details are not sent to the browser in production; the digest links the logs.
    console.error(error);
  }, [error]);

  return <ErrorState title="No pudimos cargar tu cuenta" onRetry={retry} />;
}
