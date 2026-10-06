import type { ReactNode } from "react";

import { CARD_BRAND_LABEL } from "@/features/account/domain/card";
import { formatLongDate, formatTime } from "@/shared/lib/dates";
import { BackLink } from "@/shared/ui/BackLink";

import type { Movement } from "../domain/movement";
import {
  MOVEMENT_STATUS_LABEL,
  MOVEMENT_TYPE_LABEL,
  formatSignedAmount,
} from "../domain/movement-display";
import { MovementTile } from "./MovementTile";
import { MOVEMENT_TYPE_STYLE, MovementTypeIcon } from "./MovementTypeIcon";
import { StatusBadge } from "./StatusBadge";

function DetailRow({ term, children }: { term: string; children: ReactNode }) {
  // On very narrow screens the value moves under its term instead of squeezing.
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-4 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-xs text-muted">{term}</dt>
      <dd className="min-w-0 flex-1 basis-24 text-right text-sm font-medium break-words text-foreground">
        {children}
      </dd>
    </div>
  );
}

/**
 * Movement detail (not in the Figma): same visual language as the list — the type tile,
 * the type color for the amount — plus the data a bank receipt shows.
 */
export function MovementDetail({
  movement,
  backHref,
}: {
  movement: Movement;
  backHref: string;
}) {
  const { card } = movement;
  return (
    <main className="flex flex-col px-6 pt-8">
      <BackLink href={backHref} />

      <div className="mt-8 flex flex-col items-center text-center">
        <MovementTile id={movement.id}>
          <MovementTypeIcon type={movement.type} size="lg" />
        </MovementTile>
        <h1 className="mt-5 text-xl font-semibold text-foreground">
          {movement.counterparty}
        </h1>
        <p className="mt-1 text-sm text-muted">{movement.description}</p>
        <p
          className={`mt-4 text-4xl font-semibold tabular-nums ${MOVEMENT_TYPE_STYLE[movement.type].text}`}
        >
          {formatSignedAmount(movement)}
        </p>
        <p className="mt-3">
          <StatusBadge status={movement.status} size="md" />
        </p>
      </div>

      <dl className="mt-8 divide-y divide-border rounded-3xl bg-surface lit-surface p-5 shadow-card">
        <DetailRow term="Fecha y hora">
          <span className="block">{formatLongDate(movement.occurredAt)}</span>
          <span className="block text-xs font-normal text-muted">
            {formatTime(movement.occurredAt)} h
          </span>
        </DetailRow>
        <DetailRow term="Tipo">{MOVEMENT_TYPE_LABEL[movement.type]}</DetailRow>
        <DetailRow term="Tarjeta">
          {card ? (
            <>
              {CARD_BRAND_LABEL[card.brand]}{" "}
              <span aria-hidden="true">•••• </span>
              <span className="sr-only">terminada en </span>
              {card.last4}
            </>
          ) : (
            "Sin tarjeta asociada"
          )}
        </DetailRow>
        <DetailRow term="Referencia">
          <span className="tabular-nums">{movement.reference}</span>
        </DetailRow>
        <DetailRow term="Estado">
          {MOVEMENT_STATUS_LABEL[movement.status]}
        </DetailRow>
      </dl>
    </main>
  );
}
