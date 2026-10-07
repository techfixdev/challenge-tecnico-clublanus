"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ROUTES } from "@/shared/lib/routes";
import { Button } from "@/shared/ui/Button";

import type { Movement } from "../domain/movement";
import { formatMovementCount } from "../domain/movement-display";
import { parseMovementPage } from "../domain/movement-dto";
import {
  toMovementSearchParams,
  type MovementFilters,
} from "../domain/movement-search-params";
import { MovementList } from "./MovementList";

/** A hung request must not leave the button spinning forever. */
export const LOAD_MORE_TIMEOUT_MS = 10_000;

/** `redirecting` is terminal: the session expired and the login page takes over. */
type LoadStatus = "idle" | "loading" | "error" | "redirecting";

const BUTTON_LABEL: Record<Exclude<LoadStatus, "redirecting">, string> = {
  idle: "Cargar más",
  loading: "Cargando…",
  error: "Reintentar",
};

const ERROR_MESSAGE = "No pudimos cargar más movimientos.";
const SESSION_EXPIRED_MESSAGE = "Tu sesión venció. Redirigiendo…";

const STATUS_CLASS: Record<LoadStatus, string> = {
  idle: "sr-only",
  loading: "sr-only",
  error: "text-center text-sm text-danger",
  redirecting: "text-center text-sm text-foreground",
};

class SessionExpiredError extends Error {}

function loadedAnnouncement(count: number): string {
  return `${count === 1 ? "Se cargó" : "Se cargaron"} ${formatMovementCount(count)} más`;
}

async function fetchMovementPage(url: string, signal: AbortSignal) {
  return parseMovementPage(await fetchJson(url, signal));
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal,
  });
  if (response.status === 401) throw new SessionExpiredError();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

type LoadMoreMovementsProps = {
  filters: MovementFilters;
  /** The server-rendered first page. */
  initialMovements: Movement[];
  /** Cursor returned with the first page; `null` when it is the only one. */
  initialCursor: string | null;
  /** Today's day key, decided by the server (see MovementList). */
  today: string;
};

/**
 * The movement list with "Cargar más": keyset pagination through the REST API
 * (`/api/movements?cursor=`). The first page comes from the server; later pages are
 * appended on demand and rendered as one list with it, so a page that continues a day
 * joins that day's group. The response is validated with the movement DTO schema of the
 * API, so a contract drift fails loudly.
 *
 * Failures are recoverable in place (inline message + "Reintentar"), except an expired
 * session (401), which goes to the login instead of retrying a request that cannot succeed;
 * while that navigation happens the button is gone and the reason is shown.
 */
export function LoadMoreMovements({
  filters,
  initialMovements,
  initialCursor,
  today,
}: LoadMoreMovementsProps) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Movement[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [announcement, setAnnouncement] = useState("");
  const requestRef = useRef<AbortController>(undefined);
  const paginated = initialCursor !== null;

  // Leaving the page cancels a request in flight (and its state updates).
  useEffect(
    () => () => {
      requestRef.current?.abort();
      requestRef.current = undefined;
    },
    [],
  );

  async function loadMore() {
    if (!cursor || status === "loading" || status === "redirecting") return;
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), LOAD_MORE_TIMEOUT_MS);
    setStatus("loading");
    setAnnouncement("");

    const params = toMovementSearchParams(filters);
    params.set("cursor", cursor);
    try {
      const page = await fetchMovementPage(
        `/api/movements?${params}`,
        controller.signal,
      );
      setLoaded((current) => [...current, ...page.movements]);
      setCursor(page.nextCursor);
      setAnnouncement(loadedAnnouncement(page.movements.length));
      setStatus("idle");
    } catch (error) {
      // Unmounted meanwhile: the cleanup aborted this request and nobody is listening.
      if (requestRef.current !== controller) return;
      if (error instanceof SessionExpiredError) {
        // End the pending state before navigating: the redirect may take a moment, and
        // the user should see why the list stopped instead of a button stuck on "Cargando…".
        setStatus("redirecting");
        setAnnouncement(SESSION_EXPIRED_MESSAGE);
        router.replace(ROUTES.loginExpired);
        return;
      }
      setAnnouncement(ERROR_MESSAGE);
      setStatus("error");
    } finally {
      clearTimeout(timeout);
    }
  }

  return (
    <>
      <MovementList
        movements={[...initialMovements, ...loaded]}
        today={today}
        detailSearch={toMovementSearchParams(filters).toString()}
      />
      {/* One polite live region: visible for errors and the redirect, screen-reader-only
          for progress. Only when there are more pages: a single page announces nothing. */}
      {paginated && (
        <p role="status" className={STATUS_CLASS[status]}>
          {announcement}
        </p>
      )}
      {cursor && status !== "redirecting" && (
        <Button
          variant="secondary"
          onClick={loadMore}
          disabled={status === "loading"}
          aria-busy={status === "loading"}
        >
          {BUTTON_LABEL[status]}
        </Button>
      )}
    </>
  );
}
