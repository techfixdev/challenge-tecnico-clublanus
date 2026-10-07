"use client";

import { useState, type FormEvent } from "react";

import {
  recipientInputError,
  recipientInputHint,
  type ConfirmedRecipient,
} from "../domain/transfer-form";
import { RecipientCarousel } from "./RecipientCarousel";
import { FIELD_CLASSES, FieldMessage, FormAlert } from "./TransferParts";

/** The recipient step's form; the flow's pinned button submits it from outside. */
export const RECIPIENT_FORM_ID = "recipient-form";

const FIELD_ID = "recipient";
const MESSAGE_ID = "recipient-message";

/**
 * Step 1: who gets the money. Recent counterparties are a strip of tiles to drag through
 * (settling on one chooses them, a tap goes on with them); anyone else is one alias or
 * CVU away in the field below, checked while typing with the server's own rules. Either
 * way the field holds the choice, and "Continuar" resolves it on the server to show who
 * will receive the money.
 */
export function RecipientStep({
  value,
  onChange,
  recentRecipients,
  onResolve,
  pending,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  recentRecipients: ConfirmedRecipient[];
  onResolve: (query: string) => void;
  pending: boolean;
  /** Why the last lookup (or transfer) failed for this recipient. */
  error: string | null;
}) {
  // Errors appear once the user leaves the field or tries to continue, not on the first
  // keystroke; from then on they update live.
  const [showErrors, setShowErrors] = useState(value !== "");
  const inputError = recipientInputError(value);
  const visibleError = showErrors && value !== "" ? inputError : null;
  const chosenRecent =
    recentRecipients.find((recipient) => recipient.query === value.trim()) ??
    null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);
    if (!inputError && !pending) onResolve(value);
  }

  return (
    <div className="flex flex-col">
      {recentRecipients.length > 0 ? (
        <RecipientCarousel
          recipients={recentRecipients}
          selectedQuery={chosenRecent?.query ?? null}
          onSelect={(recipient) => onChange(recipient.query)}
          onPick={(recipient) => {
            onChange(recipient.query);
            if (!pending) onResolve(recipient.query);
          }}
          disabled={pending}
        />
      ) : null}

      <form
        id={RECIPIENT_FORM_ID}
        onSubmit={handleSubmit}
        noValidate
        className="mt-8 flex flex-col"
      >
        <label
          htmlFor={FIELD_ID}
          className="text-sm font-medium text-foreground"
        >
          Alias o CVU
        </label>
        <input
          id={FIELD_ID}
          name="recipient"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => setShowErrors(true)}
          placeholder="Ej.: hincha.granate"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          aria-invalid={Boolean(visibleError)}
          aria-describedby={MESSAGE_ID}
          className={`mt-2 ${FIELD_CLASSES}`}
        />
        <div className="mt-2">
          <FieldMessage
            id={MESSAGE_ID}
            error={visibleError}
            hint={recipientInputHint(value)}
          />
        </div>

        {error ? (
          <div className="mt-4">
            <FormAlert>{error}</FormAlert>
          </div>
        ) : null}
      </form>
    </div>
  );
}
