"use client";

import type { Ref } from "react";

import { Money } from "@/shared/ui/Money";
import { Button } from "@/shared/ui/Button";

import type { ConfirmedRecipient } from "../domain/transfer-form";
import type { SourceCard } from "./AmountStep";
import { PRIMARY_DISABLED_CLASSES, StepActions } from "./StepActions";
import {
  CardLabel,
  FormAlert,
  MaskedCvu,
  StepHeader,
  SummaryRow,
} from "./TransferParts";

/**
 * Step 3: everything the transfer will do, and the only button that moves money. It
 * posts a real form to the Server Action; while it runs the button is disabled (no double
 * submit), and the idempotency key travels with it, so even a retried request pays once.
 */
export function ReviewStep({
  headingRef,
  recipient,
  amount,
  card,
  description,
  idempotencyKey,
  formAction,
  pending,
  error,
  onBack,
}: {
  headingRef: Ref<HTMLHeadingElement>;
  recipient: ConfirmedRecipient;
  /** Normalized, e.g. "12.30". */
  amount: string;
  card: SourceCard;
  description: string;
  idempotencyKey: string;
  formAction: (formData: FormData) => void;
  pending: boolean;
  error: string | null;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <StepHeader
        step={3}
        title="Revisá la transferencia"
        description="Confirmá que los datos sean correctos antes de enviar."
        headingRef={headingRef}
        back={{ onBack }}
      />

      <div className="mt-8 flex flex-col items-center text-center">
        <p className="text-xs text-muted">Vas a enviar</p>
        <p className="mt-1 text-4xl font-semibold text-foreground tabular-nums">
          <Money value={amount} currency={card.currency} />
        </p>
        <p aria-hidden="true" className="mt-1 text-xs font-medium text-muted">
          {card.currency}
        </p>
      </div>

      <dl className="mt-8 divide-y divide-border rounded-3xl bg-surface lit-surface p-5 shadow-card">
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
      </dl>

      <StepActions action={formAction}>
        <input type="hidden" name="recipient" value={recipient.query} />
        <input type="hidden" name="amount" value={amount} />
        <input type="hidden" name="cardId" value={card.id} />
        <input type="hidden" name="description" value={description.trim()} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

        {error ? <FormAlert>{error}</FormAlert> : null}

        <Button
          type="submit"
          className={PRIMARY_DISABLED_CLASSES}
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Enviando…" : "Confirmar y enviar"}
        </Button>
        <p className="text-center text-xs text-muted">
          Entre cuentas GranaBank el dinero llega al instante.
        </p>
      </StepActions>
    </div>
  );
}
