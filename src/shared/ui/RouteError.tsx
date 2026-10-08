"use client";

import { useEffect } from "react";

import { ErrorState } from "./ErrorState";

/** Props Next.js passes to an `error.tsx` boundary. */
export type RouteErrorProps = {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the segment (Next 16.3+; `reset` would only re-render). */
  retry: () => void;
};

/**
 * Shared body of the route error boundaries. In production a Server Component error
 * reaches the browser with a generic message and a `digest`; logging the digest lets the
 * failure be matched with the full error in the server logs.
 */
export function RouteError({
  title,
  error,
  retry,
}: RouteErrorProps & { title: string }) {
  useEffect(() => {
    console.error(
      `Route error boundary caught an error (digest: ${error.digest ?? "none"})`,
      error,
    );
  }, [error]);

  return <ErrorState title={title} onRetry={retry} />;
}
