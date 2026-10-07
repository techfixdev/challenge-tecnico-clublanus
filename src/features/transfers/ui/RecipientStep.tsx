"use client";

import { useState, type FormEvent, type Ref } from "react";

import { ROUTES } from "@/shared/lib/routes";
import { Button } from "@/shared/ui/Button";
import { ChevronRightIcon } from "@/shared/ui/icons";

import {
  recipientInputError,
  recipientInputHint,
  type ConfirmedRecipient,
} from "../domain/transfer-form";
import { PRIMARY_DISABLED_CLASSES, StepActions } from "./StepActions";
import {
  FIELD_CLASSES,
  FieldMessage,
  FormAlert,
  RecipientAvatar,
  RecipientIdentity,
  StepHeader,
} from "./TransferParts";

const FORM_ID = "recipient-form";
const FIELD_ID = "recipient";
const MESSAGE_ID = "recipient-message";

/**
 * Step 1: alias or CVU, checked while typing with the server's own rules, then resolved on
 * the server ("Continuar") to show who will receive the money. Recent counterparties are
 * one tap away.
 */
export function RecipientStep({
  headingRef,
  value,
  onChange,
  recentRecipients,
  onResolve,
  pending,
  error,
}: {
  headingRef: Ref<HTMLHeadingElement>;
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);
    if (!inputError && !pending) onResolve(value);
  }

  return (
    <div className="flex flex-1 flex-col">
      <StepHeader
        step={1}
        title="¿A quién le enviás?"
        description="Ingresá el alias o el CVU de la cuenta GranaBank de destino."
        headingRef={headingRef}
        back={{ href: ROUTES.home }}
      />

      <form
        id={FORM_ID}
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

      {recentRecipients.length > 0 ? (
        <section aria-labelledby="recent-recipients" className="mt-10">
          <h2
            id="recent-recipients"
            className="text-base font-medium text-foreground"
          >
            Recientes
          </h2>
          <ul className="mt-4 flex flex-col gap-4">
            {recentRecipients.map((recipient) => (
              <li key={recipient.query}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    onChange(recipient.query);
                    onResolve(recipient.query);
                  }}
                  className="flex w-full pressable items-center gap-4 rounded-2xl bg-surface lit-surface p-4 text-left shadow-card focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none active:shadow-1 disabled:opacity-70"
                >
                  <RecipientAvatar fullName={recipient.fullName} />
                  <RecipientIdentity recipient={recipient} />
                  <ChevronRightIcon className="size-5 shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Pinned under the recent recipients, the button still submits the form above. */}
      <StepActions>
        <Button
          type="submit"
          form={FORM_ID}
          className={PRIMARY_DISABLED_CLASSES}
          disabled={pending || value.trim() === ""}
          aria-busy={pending}
        >
          {pending ? "Buscando cuenta…" : "Continuar"}
        </Button>
      </StepActions>
    </div>
  );
}
