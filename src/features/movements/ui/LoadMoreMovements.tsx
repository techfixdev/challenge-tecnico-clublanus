"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { ROUTES } from "@/shared/lib/routes";
import { Button } from "@/shared/ui/Button";

import type { Movement } from "../domain/movement";
import { formatMovementCount } from "../domain/movement-display";
import { movementDtoSchema, parseMovementDto } from "../domain/movement-dto";
import {
  toMovementSearchParams,
  type MovementFilters,
} from "../domain/movement-filters";
import { MovementList } from "./MovementList";

const pageResponseSchema = z.object({
  data: z.array(movementDtoSchema),
  nextCursor: z.string().nullable(),
});

/** A hung request must not leave the button spinning forever. */
export const LOAD_MORE_TIMEOUT_MS = 10_000;

type LoadStatus = "idle" | "loading" | "error";

const BUTTON_LABEL: Record<LoadStatus, string> = {
  idle: "Cargar más",
  loading: "Cargando…",
  error: "Reintentar",
};

const ERROR_MESSAGE = "No pudimos cargar más movimientos.";

class SessionExpiredError extends Error {}

function loadedAnnouncement(count: number): string {
  return `${count === 1 ? "Se cargó" : "Se cargaron"} ${formatMovementCount(count)} más`;
}

async function fetchMovementPage(url: string, signal: AbortSignal) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal,
  });
  if (response.status === 401) throw new SessionExpiredError();
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return pageResponseSchema.parse(await response.json());
}

type LoadMoreMovementsProps = {
  filters: MovementFilters;
  /** Cursor returned with the server-rendered first page. */
  initialCursor: string;
};

/**
 * "Cargar más": keyset pagination through the REST API (`/api/movements?cursor=`).
 * The first page is server-rendered; later pages are appended on demand. The response is
 * validated with the same schema the API is built on, so a contract drift fails loudly.
 *
 * Failures are recoverable in place (inline message + "Reintentar"), except an expired
 * session (401), which goes to the login instead of retrying a request that cannot succeed.
 */
export function LoadMoreMovements({
  filters,
  initialCursor,
}: LoadMoreMovementsProps) {
  const router = useRouter();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [announcement, setAnnouncement] = useState("");
  const requestRef = useRef<AbortController>(undefined);

  // Leaving the page cancels a request in flight (and its state updates).
  useEffect(
    () => () => {
      requestRef.current?.abort();
      requestRef.current = undefined;
    },
    [],
  );

  async function loadMore() {
    if (!cursor || status === "loading") return;
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
      const next = page.data.map(parseMovementDto);
      setMovements((current) => [...current, ...next]);
      setCursor(page.nextCursor);
      setAnnouncement(loadedAnnouncement(next.length));
      setStatus("idle");
    } catch (error) {
      if (requestRef.current !== controller) return; // unmounted meanwhile
      if (error instanceof SessionExpiredError) {
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
      {movements.length > 0 && (
        <MovementList
          movements={movements}
          detailSearch={toMovementSearchParams(filters).toString()}
        />
      )}
      {/* One polite live region: visible for errors, screen-reader-only for progress. */}
      <p
        role="status"
        className={
          status === "error" ? "text-center text-sm text-danger" : "sr-only"
        }
      >
        {announcement}
      </p>
      {cursor && (
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
