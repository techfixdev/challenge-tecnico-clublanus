"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type Ref,
} from "react";

import type { Card } from "@/features/account/domain/card";
import { CardBrandLogo } from "@/features/account/ui/CardBrandLogo";
import { currencySymbol } from "@/shared/lib/currency";
import { parseAmount } from "@/shared/lib/money";
import { Button } from "@/shared/ui/Button";
import { Money } from "@/shared/ui/Money";

import { editAmount } from "../domain/amount-editing";
import {
  amountInputError,
  normalizeAmountInput,
  type ConfirmedRecipient,
} from "../domain/transfer-form";
import { DESCRIPTION_MAX_LENGTH } from "../domain/transfer-rules";
import { PRIMARY_DISABLED_CLASSES, StepActions } from "./StepActions";
import {
  CardLabel,
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

/**
 * Step 2: how much, from which card, and an optional reason. The amount is in the chosen
 * card's currency (its symbol leads the field) and accepts the Argentine "1.234,56" as
 * well as "12,30" and "12.30" (see `checkTypedAmount`); it is checked against that card's
 * balance and currency cap while typing, so "Continuar" is only enabled for a transfer
 * that can go through. Thousands are grouped while typing ("12.500,5", see
 * `editAmount`), with the caret kept next to the digit just typed.
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
  const amountError = amountInputError(amount, card);
  // A complete amount that cannot go through (balance, limit) is flagged while typing;
  // a half-typed one ("12,") waits until the field is left.
  const isComplete = parseAmount(amount) !== null;
  const visibleError =
    (showErrors || isComplete) && amount !== "" ? amountError : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);
    if (!amountError) onContinue();
  }

  return (
    <div className="flex flex-1 flex-col">
      <StepHeader
        step={2}
        title="¿Cuánto le enviás?"
        description="Elegí el monto y la tarjeta desde la que sale el dinero."
        headingRef={headingRef}
        back={{ onBack }}
      />

      <RecipientSummary recipient={recipient} onChange={onChangeRecipient} />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-8 flex flex-1 flex-col"
      >
        <AmountField
          amount={amount}
          card={card}
          error={visibleError}
          onChange={onAmountChange}
          onLeave={() => setShowErrors(true)}
        />

        <SourceCardPicker
          cards={cards}
          selectedId={card?.id}
          onSelect={onCardChange}
        />

        <DescriptionField
          description={description}
          onChange={onDescriptionChange}
        />

        {error ? (
          <div className="mt-6">
            <FormAlert>{error}</FormAlert>
          </div>
        ) : null}

        <StepActions>
          <Button
            type="submit"
            className={PRIMARY_DISABLED_CLASSES}
            disabled={Boolean(amountError) || !card}
          >
            Continuar
          </Button>
        </StepActions>
      </form>
    </div>
  );
}

/** Who the money goes to, with a way back to change it. */
function RecipientSummary({
  recipient,
  onChange,
}: {
  recipient: ConfirmedRecipient;
  onChange: () => void;
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-surface lit-surface p-4 shadow-card">
      <RecipientAvatar fullName={recipient.fullName} />
      <span className="sr-only">Para: </span>
      <RecipientIdentity recipient={recipient} />
      <button
        type="button"
        onClick={onChange}
        className="ml-auto rounded-md text-xs font-medium text-primary hover:underline focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
      >
        Cambiar
      </button>
    </div>
  );
}

/**
 * The big amount input, led by the card's currency symbol and formatted on every
 * keystroke (`editAmount`). Leaving it writes the amount the way the review shows it.
 */
function AmountField({
  amount,
  card,
  error,
  onChange,
  onLeave,
}: {
  amount: string;
  card: SourceCard | undefined;
  error: string | null;
  onChange: (value: string) => void;
  onLeave: () => void;
}) {
  const currency = card?.currency ?? "USD";

  // The caret the formatted text needs, restored once React has written that text
  // (a controlled input would otherwise leave it at the end on every regrouping).
  const input = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    if (
      input.current &&
      caret !== null &&
      document.activeElement === input.current
    ) {
      input.current.setSelectionRange(caret, caret);
    }
  }, [amount]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { value, selectionStart } = event.target;
    const edited = editAmount(amount, value, selectionStart ?? value.length);
    if (edited.value === amount) {
      // An ignored keystroke (a second comma): no re-render, so put the text and the
      // caret back here.
      event.target.value = amount;
      event.target.setSelectionRange(edited.caret, edited.caret);
      return;
    }
    pendingCaret.current = edited.caret;
    onChange(edited.value);
  }

  function handleBlur() {
    onLeave();
    // "1234,5" → "1.234,50", as the review and the receipt write it.
    const normalized = normalizeAmountInput(amount);
    if (normalized !== amount) onChange(normalized);
  }

  return (
    <>
      <label htmlFor={AMOUNT_ID} className="sr-only">
        Monto en {currency}
      </label>
      <div className="flex items-baseline justify-center gap-1">
        <span
          aria-hidden="true"
          data-testid="amount-currency"
          className="text-3xl font-medium text-muted"
        >
          {currencySymbol(currency)}
        </span>
        {/* The input sits on an invisible copy of its text, so its width follows the
            digits and the symbol stays right next to the number, centered as a whole. */}
        <span className="inline-grid max-w-[calc(100%-4.5rem)] text-5xl font-semibold tabular-nums">
          <span
            aria-hidden="true"
            className="invisible col-start-1 row-start-1 overflow-hidden whitespace-pre"
          >
            {amount || "0"}
          </span>
          <input
            ref={input}
            id={AMOUNT_ID}
            name="amount"
            value={amount}
            onChange={handleChange}
            onBlur={handleBlur}
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="next"
            placeholder="0"
            // Intrinsic width of one character: the mirror text sets the real width.
            size={1}
            aria-invalid={Boolean(error)}
            aria-describedby={AMOUNT_MESSAGE_ID}
            className="col-start-1 row-start-1 w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-muted/40"
          />
        </span>
      </div>
      <div className="mt-3 text-center">
        <FieldMessage
          id={AMOUNT_MESSAGE_ID}
          error={error}
          hint={
            card ? (
              <>
                Disponible:{" "}
                <span className="font-medium text-foreground tabular-nums">
                  <Money value={card.balance} currency={card.currency} />
                </span>
              </>
            ) : null
          }
        />
      </div>
    </>
  );
}

/** "Desde": the cards as one radio group, each with its brand and available balance. */
function SourceCardPicker({
  cards,
  selectedId,
  onSelect,
}: {
  cards: SourceCard[];
  selectedId: string | undefined;
  onSelect: (cardId: string) => void;
}) {
  return (
    <fieldset className="mt-8 min-w-0">
      <legend className="text-sm font-medium text-foreground">Desde</legend>
      <div className="mt-2 flex flex-col gap-3">
        {cards.map((card) => (
          <SourceCardOption
            key={card.id}
            card={card}
            isSelected={card.id === selectedId}
            onSelect={() => onSelect(card.id)}
          />
        ))}
      </div>
    </fieldset>
  );
}

function SourceCardOption({
  card,
  isSelected,
  onSelect,
}: {
  card: SourceCard;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      data-selected={isSelected}
      className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-surface lit-surface p-4 shadow-card ring-2 ring-transparent transition-shadow has-focus-visible:ring-primary/40 data-[selected=true]:ring-primary"
    >
      <input
        type="radio"
        name="sourceCard"
        value={card.id}
        checked={isSelected}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-background inset-shadow-recessed"
      >
        <CardBrandLogo brand={card.brand} />
      </span>
      <span className="flex min-w-0 flex-1 basis-24 flex-col">
        <span className="text-[15px] font-medium text-foreground">
          <CardLabel card={card} />
        </span>
        <span className="text-xs text-muted">
          Disponible{" "}
          <span className="tabular-nums">
            <Money value={card.balance} currency={card.currency} />
          </span>
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`ml-auto flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? "border-primary" : "border-border"}`}
      >
        {isSelected ? (
          <span className="size-2.5 rounded-full bg-primary" />
        ) : null}
      </span>
    </label>
  );
}

/** The optional reason, with a live character count against the server's limit. */
function DescriptionField({
  description,
  onChange,
}: {
  description: string;
  onChange: (value: string) => void;
}) {
  return (
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
        onChange={(event) => onChange(event.target.value)}
        maxLength={DESCRIPTION_MAX_LENGTH}
        placeholder="Ej.: Entradas para el sábado"
        autoComplete="off"
        enterKeyHint="next"
        aria-describedby={DESCRIPTION_COUNT_ID}
        className={`mt-2 ${FIELD_CLASSES}`}
      />
    </div>
  );
}
