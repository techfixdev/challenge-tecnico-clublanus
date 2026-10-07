"use client";

import * as m from "motion/react-m";
import type { Ref } from "react";

import { formatLongDate, formatTime } from "@/shared/lib/dates";
import { ROUTES } from "@/shared/lib/routes";
import { buttonClassName } from "@/shared/ui/Button";
import { Money } from "@/shared/ui/Money";
import { MotionLink } from "@/shared/ui/motion/MotionLink";
import { CLOSE_QUICK_ACTION, PUSH } from "@/shared/ui/motion/navigation";
import { FADE } from "@/shared/ui/motion/springs";
import { DURATION_S, EASE } from "@/shared/ui/motion/tokens";
import { useReducedMotionPreference } from "@/shared/ui/reduced-motion";

import type { TransferReceipt } from "../domain/transfer-model";
import { StepActions } from "./StepActions";
import { CardLabel, SummaryRow } from "./TransferParts";

/** The check is traced like a pen once the badge is in (≈300ms, no bounce). */
const DRAW = {
  duration: DURATION_S.base,
  delay: DURATION_S.fast / 2,
  ease: EASE,
};

/**
 * The transfer went through. The badge fades in where it rests (no pop, no bounce) and
 * the check draws itself like a pen stroke; under reduced motion everything is simply
 * there.
 */
export function TransferSuccess({
  receipt,
  headingRef,
}: {
  receipt: TransferReceipt;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const reduced = useReducedMotionPreference();
  const { sourceCard } = receipt;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-6 flex flex-col items-center text-center">
        <m.span
          aria-hidden="true"
          data-testid="success-badge"
          className="flex size-20 items-center justify-center rounded-3xl bg-success-soft lit-soft text-success inset-shadow-specular-soft"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={FADE}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-10"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <m.path
              d="m5 12.5 4.5 4.5L19 7.5"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={DRAW}
            />
          </svg>
        </m.span>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-6 text-xl font-semibold text-foreground outline-none"
        >
          ¡Transferencia enviada!
        </h1>
        <p className="mt-1 text-sm text-muted">
          Le enviaste a {receipt.recipient.fullName}
        </p>
        <p className="mt-4 text-4xl font-semibold text-foreground tabular-nums">
          <Money value={receipt.amount} currency={receipt.currency} />
        </p>
      </div>

      <dl className="mt-8 divide-y divide-border rounded-3xl bg-surface lit-surface p-5 shadow-card">
        <SummaryRow term="Para">
          <span className="block">{receipt.recipient.fullName}</span>
          {receipt.recipient.alias ? (
            <span className="block text-xs font-normal text-muted">
              {receipt.recipient.alias}
            </span>
          ) : null}
        </SummaryRow>
        <SummaryRow term="Fecha y hora">
          <span className="block">{formatLongDate(receipt.createdAt)}</span>
          <span className="block text-xs font-normal text-muted">
            {formatTime(receipt.createdAt)} h
          </span>
        </SummaryRow>
        {receipt.description ? (
          <SummaryRow term="Motivo">{receipt.description}</SummaryRow>
        ) : null}
        {sourceCard ? (
          <SummaryRow term="Desde">
            <span className="block">
              <CardLabel card={sourceCard} />
            </span>
            <span className="block text-xs font-normal text-muted">
              Saldo:{" "}
              <Money value={sourceCard.balance} currency={receipt.currency} />
            </span>
          </SummaryRow>
        ) : null}
        {receipt.reference ? (
          <SummaryRow term="Referencia">
            <span className="tabular-nums">{receipt.reference}</span>
          </SummaryRow>
        ) : null}
      </dl>

      <StepActions>
        {receipt.movementId ? (
          <MotionLink
            href={ROUTES.movement(receipt.movementId)}
            transitionTypes={PUSH}
            className={buttonClassName()}
          >
            Ver comprobante
          </MotionLink>
        ) : null}
        <MotionLink
          href={ROUTES.home}
          transitionTypes={CLOSE_QUICK_ACTION}
          className={buttonClassName({ variant: "secondary" })}
        >
          Volver al inicio
        </MotionLink>
      </StepActions>
    </div>
  );
}
