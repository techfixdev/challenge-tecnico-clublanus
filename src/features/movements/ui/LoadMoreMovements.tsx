"use client";

import { useState } from "react";
import { z } from "zod";

import { Button } from "@/shared/ui/Button";

import type { Movement } from "../domain/movement";
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

type LoadStatus = "idle" | "loading" | "error";

const BUTTON_LABEL: Record<LoadStatus, string> = {
  idle: "Cargar más",
  loading: "Cargando…",
  error: "Reintentar",
};

type LoadMoreMovementsProps = {
  filters: MovementFilters;
  /** Cursor returned with the server-rendered first page. */
  initialCursor: string;
};

/**
 * "Cargar más": keyset pagination through the REST API (`/api/movements?cursor=`).
 * The first page is server-rendered; later pages are appended on demand. The response is
 * validated with the same schema the API is built on, so a contract drift fails loudly.
 */
export function LoadMoreMovements({
  filters,
  initialCursor,
}: LoadMoreMovementsProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [announcement, setAnnouncement] = useState("");

  async function loadMore() {
    if (!cursor) return;
    setStatus("loading");
    try {
      const params = toMovementSearchParams(filters);
      params.set("cursor", cursor);
      const response = await fetch(`/api/movements?${params}`, {
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const page = pageResponseSchema.parse(await response.json());
      const next = page.data.map(parseMovementDto);
      setMovements((current) => [...current, ...next]);
      setCursor(page.nextCursor);
      setAnnouncement(
        next.length === 1
          ? "Se cargó 1 movimiento más"
          : `Se cargaron ${next.length} movimientos más`,
      );
      setStatus("idle");
    } catch {
      setStatus("error");
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
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {status === "error" && (
        <p role="alert" className="text-center text-sm text-danger">
          No pudimos cargar más movimientos.
        </p>
      )}
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
