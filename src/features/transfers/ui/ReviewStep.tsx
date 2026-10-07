"use client";

import * as m from "motion/react-m";

import { Money } from "@/shared/ui/Money";
import { useReducedMotionPreference } from "@/shared/ui/reduced-motion";

import type { ConfirmedRecipient } from "../domain/transfer-form";
import type { SourceCard } from "./AmountStep";
import { CardLabel, MaskedCvu, SummaryRow } from "./TransferParts";
import { MORPH_ID, arrivalTransition, morphTransition } from "./transfer-morph";

/** The review's form; the flow's pinned "Confirmar y enviar" submits it from outside. */
export const REVIEW_FORM_ID = "review-form";

/**
 * Step 3, the same surface with the keypad folded away: the amount stays big where it
 * was, and the rows of what the transfer will do open under it. Confirming posts a real
 * form to the Server Action; while it runs the flow disables its button (no double
 * submit), and the idempotency key travels with it, so even a retried request pays once.
 */
export function ReviewStep({
  recipient,
  amount,
  card,
  description,
  idempotencyKey,
  formAction,
}: {
  recipient: ConfirmedRecipient;
  /** Normalized, e.g. "12.30". */
  amount: string;
  card: SourceCard;
  description: string;
  idempotencyKey: string;
  formAction: (formData: FormData) => void;
}) {
  const reduced = useReducedMotionPreference();
  return (
    <div className="mt-6 flex flex-col">
      <m.div
        layoutId={MORPH_ID.amount}
        transition={morphTransition(reduced)}
        className="flex flex-col items-center text-center"
      >
        <p className="text-4xl font-semibold text-foreground tabular-nums">
          <Money value={amount} currency={card.currency} />
        </p>
        <p aria-hidden="true" className="mt-1 text-xs font-medium text-muted">
          {card.currency}
        </p>
      </m.div>

      <m.dl
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={arrivalTransition(reduced)}
        className="mt-6 divide-y divide-border rounded-3xl bg-surface lit-surface p-5 shadow-card"
      >
        <SummaryRow term="Para">
          <span className="block">{recipient.fullName}</span>
          {recipient.alias ? (
            <span className="block text-xs font-normal text-muted">
              {recipient.alias}
            </span>
          ) : null}
        </SummaryRow>
        {recipient.cvuMasked ? (
          <SummaryRow term="CVU">
            <MaskedCvu cvuMasked={recipient.cvuMasked} />
          </SummaryRow>
        ) : null}
        <SummaryRow term="Desde">
          <CardLabel card={card} />
        </SummaryRow>
        {description.trim() ? (
          <SummaryRow term="Motivo">{description.trim()}</SummaryRow>
        ) : null}
      </m.dl>

      <form id={REVIEW_FORM_ID} action={formAction} hidden>
        <input type="hidden" name="recipient" value={recipient.query} />
        <input type="hidden" name="amount" value={amount} />
        <input type="hidden" name="cardId" value={card.id} />
        <input type="hidden" name="description" value={description.trim()} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      </form>
    </div>
  );
}
