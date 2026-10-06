"use client";

import { useState, type FormEvent, type Ref } from "react";

import { CARD_BRAND_LABEL, type Card } from "@/features/account/domain/card";
import { CardBrandLogo } from "@/features/account/ui/CardBrandLogo";
import { formatMoney } from "@/shared/lib/format";
import { parseAmount } from "@/shared/lib/money";
import { Button } from "@/shared/ui/Button";

import {
  amountInputError,
  normalizeAmountInput,
  type ConfirmedRecipient,
} from "../domain/transfer-form";
import { DESCRIPTION_MAX_LENGTH } from "../domain/transfer-schema";
import {
  FIELD_CLASSES,
  FieldMessage,
  FormAlert,
  RecipientAvatar,
  RecipientIdentity,
  StepHeader,
} from "./TransferParts";

export type SourceCard = Pick<
  Card,
  "id" | "brand" | "last4" | "balance" | "currency"
>;

const AMOUNT_ID = "amount";
const AMOUNT_MESSAGE_ID = "amount-message";
const DESCRIPTION_ID = "description";
const DESCRIPTION_COUNT_ID = "description-count";

/** Typing stays forgiving: digits and one kind of separator, nothing else. */
function sanitizeAmount(raw: string): string {
  return raw.replace(/[^\d.,]/g, "");
}

/**
 * Step 2: how much, from which card, and an optional reason. The amount accepts "12,30"
 * and "12.30"; it is checked against the chosen card's balance while typing, so
 * "Continuar" is only enabled for a transfer that can go through.
 */
export function AmountStep({
  headingRef,
  recipient,
  onChangeRecipient,
  cards,
  amount,
  onAmountChange,
  cardId,
  onCardChange,
  description,
  onDescriptionChange,
  onContinue,
  onBack,
  error,
}: {
  headingRef: Ref<HTMLHeadingElement>;
  recipient: ConfirmedRecipient;
  onChangeRecipient: () => void;
  cards: SourceCard[];
  amount: string;
  onAmountChange: (value: string) => void;
  cardId: string;
  onCardChange: (cardId: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
  error: string | null;
}) {
  const [showErrors, setShowErrors] = useState(amount !== "");
  const card = cards.find((candidate) => candidate.id === cardId) ?? cards[0];
  const amountError = amountInputError(amount, card?.balance);
  // A complete amount that cannot go through (balance, limit) is flagged while typing;
  // a half-typed one ("12,") waits until the field is left.
  const complete = parseAmount(amount) !== null;
  const visibleError =
    (showErrors || complete) && amount !== "" ? amountError : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);
    if (!amountError) onContinue();
  }

  return (
    <div className="flex flex-col">
      <StepHeader
        step={2}
        title="¿Cuánto le enviás?"
        description="Elegí el monto y la tarjeta desde la que sale el dinero."
        headingRef={headingRef}
        back={{ onBack }}
      />

      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-surface p-4 shadow-card">
        <RecipientAvatar fullName={recipient.fullName} />
        <span className="sr-only">Para: </span>
        <RecipientIdentity recipient={recipient} />
        <button
          type="button"
          onClick={onChangeRecipient}
          className="ml-auto rounded-md text-xs font-medium text-primary hover:underline focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
        >
          Cambiar
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col">
        <label htmlFor={AMOUNT_ID} className="sr-only">
          Monto en {card?.currency ?? "USD"}
        </label>
        <div className="flex items-baseline justify-center gap-1">
          <span aria-hidden="true" className="text-3xl font-medium text-muted">
            $
          </span>
          {/* The input sits on an invisible copy of its text, so its width follows the
              digits and "$" stays right next to the number, centered as a whole. */}
          <span className="inline-grid max-w-[calc(100%-2rem)] text-5xl font-semibold tabular-nums">
            <span
              aria-hidden="true"
              className="invisible col-start-1 row-start-1 overflow-hidden whitespace-pre"
            >
              {amount || "0"}
            </span>
            <input
              id={AMOUNT_ID}
              name="amount"
              value={amount}
              onChange={(event) =>
                onAmountChange(sanitizeAmount(event.target.value))
              }
              onBlur={() => {
                setShowErrors(true);
                // "12,3" → "12.30", as the review and the receipt write it.
                const normalized = normalizeAmountInput(amount);
                if (normalized !== amount) onAmountChange(normalized);
              }}
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="next"
              placeholder="0"
              // Intrinsic width of one character: the mirror text sets the real width.
              size={1}
              aria-invalid={Boolean(visibleError)}
              aria-describedby={AMOUNT_MESSAGE_ID}
              className="col-start-1 row-start-1 w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-muted/40"
            />
          </span>
        </div>
        <div className="mt-3 text-center">
          <FieldMessage
            id={AMOUNT_MESSAGE_ID}
            error={visibleError}
            hint={
              card ? (
                <>
                  Disponible:{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {formatMoney(card.balance, card.currency)}
                  </span>
                </>
              ) : null
            }
          />
        </div>

        <fieldset className="mt-8 min-w-0">
          <legend className="text-sm font-medium text-foreground">Desde</legend>
          <div className="mt-2 flex flex-col gap-3">
            {cards.map((option) => {
              const selected = option.id === card?.id;
              return (
                <label
                  key={option.id}
                  data-selected={selected}
                  className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-surface p-4 shadow-card ring-2 ring-transparent transition-shadow has-focus-visible:ring-primary/40 data-[selected=true]:ring-primary"
                >
                  <input
                    type="radio"
                    name="sourceCard"
                    value={option.id}
                    checked={selected}
                    onChange={() => onCardChange(option.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-background"
                  >
                    <CardBrandLogo brand={option.brand} />
                  </span>
                  <span className="flex min-w-0 flex-1 basis-24 flex-col">
                    <span className="text-[15px] font-medium text-foreground">
                      {CARD_BRAND_LABEL[option.brand]}{" "}
                      <span aria-hidden="true">•••• </span>
                      <span className="sr-only">terminada en </span>
                      {option.last4}
                    </span>
                    <span className="text-xs text-muted">
                      Disponible{" "}
                      <span className="tabular-nums">
                        {formatMoney(option.balance, option.currency)}
                      </span>
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`ml-auto flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${selected ? "border-primary" : "border-border"}`}
                  >
                    {selected ? (
                      <span className="size-2.5 rounded-full bg-primary" />
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-8 flex flex-col">
          <div className="flex items-baseline justify-between">
            <label
              htmlFor={DESCRIPTION_ID}
              className="text-sm font-medium text-foreground"
            >
              Motivo <span className="font-normal text-muted">(opcional)</span>
            </label>
            <span
              id={DESCRIPTION_COUNT_ID}
              className="text-xs text-muted tabular-nums"
            >
              {description.length}/{DESCRIPTION_MAX_LENGTH}
            </span>
          </div>
          <input
            id={DESCRIPTION_ID}
            name="description"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            maxLength={DESCRIPTION_MAX_LENGTH}
            placeholder="Ej.: Entradas para el sábado"
            autoComplete="off"
            enterKeyHint="next"
            aria-describedby={DESCRIPTION_COUNT_ID}
            className={`mt-2 ${FIELD_CLASSES}`}
          />
        </div>

        {error ? (
          <div className="mt-6">
            <FormAlert>{error}</FormAlert>
          </div>
        ) : null}

        <Button
          type="submit"
          className="mt-8"
          disabled={Boolean(amountError) || !card}
        >
          Continuar
        </Button>
      </form>
    </div>
  );
}
