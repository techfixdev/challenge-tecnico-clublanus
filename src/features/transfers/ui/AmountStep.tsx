"use client";

import * as m from "motion/react-m";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import type { Card } from "@/features/account/domain/card";
import { CardBrandLogo } from "@/features/account/ui/CardBrandLogo";
import { currencySymbol } from "@/shared/lib/currency";
import { parseAmount } from "@/shared/lib/money";
import { Money } from "@/shared/ui/Money";
import { useReducedMotionPreference } from "@/shared/ui/reduced-motion";

import { editAmount } from "../domain/amount-editing";
import {
  amountInputError,
  normalizeAmountInput,
} from "../domain/transfer-form";
import { DESCRIPTION_MAX_LENGTH } from "../domain/transfer-rules";
import {
  CardLabel,
  FIELD_CLASSES,
  FieldMessage,
  FormAlert,
} from "./TransferParts";
import { MORPH_ID, morphTransition } from "./transfer-morph";

export type SourceCard = Pick<
  Card,
  "id" | "brand" | "last4" | "balance" | "currency"
>;

/** The amount step's form; the flow's pinned button submits it from outside. */
export const AMOUNT_FORM_ID = "amount-form";

const AMOUNT_ID = "amount";
const AMOUNT_MESSAGE_ID = "amount-message";
const DESCRIPTION_ID = "description";
const DESCRIPTION_COUNT_ID = "description-count";

/**
 * Step 2, under the recipient's header row: the big amount, the card it leaves from and
 * an optional reason. The digits come from the flow's keypad (pinned below), a hardware
 * keyboard or a paste; the amount is in the chosen card's currency (its symbol leads it)
 * and is checked against that card's balance and currency cap as it changes, so
 * "Continuar" only goes on with a transfer that can go through. Thousands are grouped
 * as digits come in ("12.500,5", see `editAmount`).
 */
export function AmountStep({
  cards,
  amount,
  onAmountChange,
  cardId,
  onCardChange,
  description,
  onDescriptionChange,
  onTypingDescription,
  onContinue,
  error,
}: {
  cards: SourceCard[];
  amount: string;
  onAmountChange: (value: string) => void;
  cardId: string;
  onCardChange: (cardId: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  /** The reason field took or left the focus: the phone's keyboard replaces the keypad. */
  onTypingDescription: (typing: boolean) => void;
  onContinue: () => void;
  error: string | null;
}) {
  const [showErrors, setShowErrors] = useState(amount !== "");
  const card = cards.find((candidate) => candidate.id === cardId) ?? cards[0];
  const amountError = amountInputError(amount, card);
  // A complete amount that cannot go through (balance, limit) is flagged at once; a
  // half-typed one ("12,") waits until the user tries to go on or leaves the field.
  const isComplete = parseAmount(amount) !== null;
  const visibleError =
    (showErrors || isComplete) && amount !== "" ? amountError : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);
    if (!amountError) onContinue();
  }

  return (
    <form
      id={AMOUNT_FORM_ID}
      onSubmit={handleSubmit}
      noValidate
      className="mt-4 flex flex-col"
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
        onTyping={onTypingDescription}
      />

      {error ? (
        <div className="mt-4">
          <FormAlert>{error}</FormAlert>
        </div>
      ) : null}
    </form>
  );
}

/**
 * The big amount, led by the card's currency symbol. It is a real field, so a hardware
 * keyboard and a paste type into it (formatted on every keystroke by `editAmount`), but
 * it asks the phone for no keyboard (`inputMode="none"`): the flow's keypad is the
 * keyboard. Leaving it writes the amount the way the review shows it.
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
  const reduced = useReducedMotionPreference();
  const currency = card?.currency ?? "USD";

  // The caret the formatted text needs, restored once React has written that text
  // (a controlled input would otherwise leave it at the end on every regrouping). A
  // keypad press leaves no caret: the digit went at the end, so the caret goes there.
  const input = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const caret = pendingCaret.current ?? amount.length;
    pendingCaret.current = null;
    if (input.current && document.activeElement === input.current) {
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
      {/* The amount keeps its identity into the review and the receipt (MORPH_ID). */}
      <m.div
        layoutId={MORPH_ID.amount}
        transition={morphTransition(reduced)}
        className="flex items-baseline justify-center gap-1 font-display"
      >
        <span
          aria-hidden="true"
          data-testid="amount-currency"
          className="text-[32px] font-medium text-muted"
        >
          {currencySymbol(currency)}
        </span>
        {/* The input sits on an invisible copy of its text, so its width follows the
            digits and the symbol stays right next to the number, centered as a whole. */}
        <span className="inline-grid max-w-[calc(100%-4.5rem)] text-[52px] leading-none font-semibold">
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
            inputMode="none"
            autoComplete="off"
            enterKeyHint="next"
            placeholder="0"
            // Intrinsic width of one character: the mirror text sets the real width.
            size={1}
            aria-invalid={Boolean(error)}
            aria-describedby={AMOUNT_MESSAGE_ID}
            className="col-start-1 row-start-1 w-full min-w-0 bg-transparent text-foreground caret-primary outline-none placeholder:text-muted/40"
          />
        </span>
      </m.div>
      <div className="mt-2 text-center">
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

/**
 * "Desde": the cards as one radio group of compact tiles side by side (they stack on a
 * narrow screen), so the keypad below keeps its room.
 */
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
    <fieldset className="mt-4 min-w-0">
      <legend className="text-sm font-medium text-foreground">Desde</legend>
      <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2">
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
      className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl bg-surface lit-surface px-3 py-2 shadow-card ring-2 ring-transparent transition-shadow has-focus-visible:ring-primary/40 data-[selected=true]:ring-primary"
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
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background inset-shadow-recessed"
      >
        <CardBrandLogo brand={card.brand} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium break-words text-foreground">
          <CardLabel card={card} />
        </span>
        <span className="text-xs text-muted tabular-nums">
          <Money value={card.balance} currency={card.currency} />
        </span>
      </span>
    </label>
  );
}

/** The optional reason, with a live character count against the server's limit. */
function DescriptionField({
  description,
  onChange,
  onTyping,
}: {
  description: string;
  onChange: (value: string) => void;
  onTyping: (typing: boolean) => void;
}) {
  return (
    <div className="mt-4 flex flex-col">
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
        onFocus={() => onTyping(true)}
        onBlur={() => onTyping(false)}
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
