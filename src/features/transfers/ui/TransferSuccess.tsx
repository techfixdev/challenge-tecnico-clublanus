"use client";

import * as m from "motion/react-m";
import Link from "next/link";
import type { ReactNode, Ref } from "react";

import { CARD_BRAND_LABEL } from "@/features/account/domain/card";
import { formatLongDate, formatTime } from "@/shared/lib/dates";
import { formatMoney } from "@/shared/lib/format";
import { ROUTES } from "@/shared/lib/routes";
import { buttonClassName } from "@/shared/ui/Button";
import { useReducedMotionPreference } from "@/shared/ui/reduced-motion";

import type { TransferReceipt } from "../domain/transfer-model";

const POP_SPRING = { type: "spring", stiffness: 380, damping: 22 } as const;
const ENTER_EASE = [0.22, 1, 0.36, 1] as const;

function ReceiptRow({ term, children }: { term: string; children: ReactNode }) {
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
 * The transfer went through. The check pops in and draws itself (a spring for the
 * badge, the stroke traced like a pen); under reduced motion everything is simply there.
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
    <div className="flex flex-col">
      <div className="mt-6 flex flex-col items-center text-center">
        <m.span
          aria-hidden="true"
          data-testid="success-badge"
          className="flex size-20 items-center justify-center rounded-3xl bg-success-soft lit-soft text-success inset-shadow-specular-soft"
          initial={reduced ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={POP_SPRING}
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
              transition={{ duration: 0.36, delay: 0.14, ease: ENTER_EASE }}
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
          {formatMoney(receipt.amount, receipt.currency)}
        </p>
      </div>

      <dl className="mt-8 divide-y divide-border rounded-3xl bg-surface lit-surface p-5 shadow-card">
        <ReceiptRow term="Para">
          <span className="block">{receipt.recipient.fullName}</span>
          {receipt.recipient.alias ? (
            <span className="block text-xs font-normal text-muted">
              {receipt.recipient.alias}
            </span>
          ) : null}
        </ReceiptRow>
        <ReceiptRow term="Fecha y hora">
          <span className="block">{formatLongDate(receipt.createdAt)}</span>
          <span className="block text-xs font-normal text-muted">
            {formatTime(receipt.createdAt)} h
          </span>
        </ReceiptRow>
        {receipt.description ? (
          <ReceiptRow term="Motivo">{receipt.description}</ReceiptRow>
        ) : null}
        {sourceCard ? (
          <ReceiptRow term="Desde">
            <span className="block">
              {CARD_BRAND_LABEL[sourceCard.brand]}{" "}
              <span aria-hidden="true">•••• </span>
              <span className="sr-only">terminada en </span>
              {sourceCard.last4}
            </span>
            <span className="block text-xs font-normal text-muted">
              Saldo: {formatMoney(sourceCard.balance, receipt.currency)}
            </span>
          </ReceiptRow>
        ) : null}
        {receipt.reference ? (
          <ReceiptRow term="Referencia">
            <span className="tabular-nums">{receipt.reference}</span>
          </ReceiptRow>
        ) : null}
      </dl>

      <div className="mt-8 flex flex-col gap-3">
        {receipt.movementId ? (
          <Link
            href={ROUTES.movement(receipt.movementId)}
            className={buttonClassName()}
          >
            Ver comprobante
          </Link>
        ) : null}
        <Link
          href={ROUTES.home}
          className={buttonClassName({ variant: "secondary" })}
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
