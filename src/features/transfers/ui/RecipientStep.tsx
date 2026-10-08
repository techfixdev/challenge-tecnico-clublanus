"use client";

import {
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { CloseIcon, SearchIcon } from "@/shared/ui/icons";

import { searchRecipients } from "../domain/recipient-search";
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
const LISTBOX_ID = "recent-recipients-listbox";

const NO_MATCHES = "Sin coincidencias en tus recientes";

/** What a screen reader hears after each keystroke: how many recents are left. */
function resultsAnnouncement(count: number): string {
  if (count === 0) return NO_MATCHES;
  return count === 1 ? "1 reciente coincide" : `${count} recientes coinciden`;
}

/**
 * Step 1: who gets the money. One search field on top: typing a name, alias or the end
 * of a CVU narrows the recent counterparties, a strip of tiles to drag through (settling
 * on one chooses them, a tap goes on with them), and the first match is chosen. Text that
 * is an alias or CVU of someone else is offered as a lookup, checked while typing with the
 * server's own rules. "Continuar" resolves the choice (the chosen tile, else the text) on
 * the server to show who will receive the money.
 *
 * `search` is what was typed; `value` is what "Continuar" resolves. They differ once a
 * tile is chosen: a drag chooses without rewriting the search, so the strip it narrowed
 * stays as it was.
 *
 * Typed text is read from the field itself, never only from React's `onChange`, so none
 * is ever lost (see `searchWhatWasTyped`).
 */
export function RecipientStep({
  search,
  onSearchChange,
  value,
  onChange,
  recentRecipients,
  onResolve,
  pending,
  error,
}: {
  search: string;
  onSearchChange: (search: string) => void;
  value: string;
  onChange: (value: string) => void;
  recentRecipients: ConfirmedRecipient[];
  onResolve: (query: string) => void;
  pending: boolean;
  /** Why the last lookup (or transfer) failed for this recipient. */
  error: string | null;
}) {
  const fieldRef = useRef<HTMLInputElement>(null);
  const { matches, lookup } = searchRecipients(search, recentRecipients);
  const chosenRecent =
    matches.find((recipient) => recipient.query === value.trim()) ?? null;
  // Errors appear once the user leaves the field or tries to continue, not on the first
  // keystroke; from then on they update live. A chosen tile has nothing to fix.
  const [showErrors, setShowErrors] = useState(search !== "");
  const inputError = chosenRecent ? null : recipientInputError(value);
  const visibleError = showErrors && value !== "" ? inputError : null;
  const searching = search.trim() !== "";
  const showStrip = recentRecipients.length > 0 && matches.length > 0;

  /** Typing chooses the first recent that matches, else the text itself. */
  function changeSearch(text: string) {
    onSearchChange(text);
    if (text.trim() === "") {
      onChange("");
      return;
    }
    onChange(
      searchRecipients(text, recentRecipients).matches[0]?.query ?? text,
    );
  }

  const searchWhatWasTyped = useEffectEvent(changeSearch);

  // The search follows the field's own `input` event, not React's onChange, which misses
  // text in two cases: React turns its events off while it starts a view transition until
  // the browser captures the old screen, so a paste delivered meanwhile never reaches
  // onChange; and text typed before hydration is kept in the field without any event at
  // all (the field then differs from its server value, `defaultValue`). onChange still
  // mirrors the text, so React never puts the old one back.
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    if (field.value !== field.defaultValue) searchWhatWasTyped(field.value);
    const onInput = () => searchWhatWasTyped(field.value);
    field.addEventListener("input", onInput);
    return () => field.removeEventListener("input", onInput);
  }, []);

  function clearSearch() {
    changeSearch("");
    setShowErrors(false);
    fieldRef.current?.focus();
  }

  function resolveLookup(query: string) {
    if (pending) return;
    onChange(query);
    onResolve(query);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);
    if (!inputError && !pending) onResolve(value);
  }

  return (
    <div className="flex flex-col">
      <form
        id={RECIPIENT_FORM_ID}
        onSubmit={handleSubmit}
        noValidate
        role="search"
        className="mt-8 flex flex-col"
      >
        <label htmlFor={FIELD_ID} className="sr-only">
          Buscar por nombre, alias o CVU
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
          <input
            ref={fieldRef}
            id={FIELD_ID}
            name="recipient"
            role="combobox"
            aria-controls={showStrip ? LISTBOX_ID : undefined}
            aria-expanded={showStrip}
            aria-autocomplete="list"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onBlur={() => setShowErrors(true)}
            readOnly={pending}
            placeholder="Buscar por nombre, alias o CVU"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="search"
            enterKeyHint="search"
            aria-invalid={Boolean(visibleError)}
            aria-describedby={MESSAGE_ID}
            className={`${FIELD_CLASSES} pr-12 pl-11`}
          />
          {search !== "" ? (
            <button
              type="button"
              onClick={clearSearch}
              disabled={pending}
              aria-label="Borrar búsqueda"
              className="absolute top-0 right-0 grid size-12 place-items-center rounded-xl text-muted hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none disabled:opacity-50"
            >
              <CloseIcon className="size-5" />
            </button>
          ) : null}
        </div>
        <div className="mt-2">
          <FieldMessage
            id={MESSAGE_ID}
            error={visibleError}
            hint={chosenRecent ? null : recipientInputHint(value)}
          />
        </div>
      </form>

      <p aria-live="polite" className="sr-only">
        {searching && recentRecipients.length > 0
          ? resultsAnnouncement(matches.length)
          : ""}
      </p>

      {showStrip ? (
        <RecipientCarousel
          id={LISTBOX_ID}
          recipients={matches}
          selectedQuery={chosenRecent?.query ?? null}
          onSelect={(recipient) => onChange(recipient.query)}
          onPick={(recipient) => {
            onChange(recipient.query);
            if (!pending) onResolve(recipient.query);
          }}
          disabled={pending}
        />
      ) : null}

      {recentRecipients.length > 0 && !showStrip ? (
        <section aria-labelledby="recent-recipients-empty" className="mt-8">
          <h2
            id="recent-recipients-empty"
            className="text-base font-medium text-foreground"
          >
            Recientes
          </h2>
          <p
            aria-hidden="true"
            className="mt-4 grid h-28 place-items-center rounded-3xl border border-dashed border-border px-6 text-center text-sm text-muted"
          >
            {NO_MATCHES}
          </p>
        </section>
      ) : null}

      {lookup ? (
        <LookupOffer
          query={lookup}
          isCvu={/^\d+$/.test(lookup)}
          disabled={pending}
          onLookup={() => resolveLookup(lookup)}
        />
      ) : null}

      {error ? (
        <div className="mt-4">
          <FormAlert>{error}</FormAlert>
        </div>
      ) : null}
    </div>
  );
}

/** "Buscar «ramiro.lanus»": looks up an account that is not among the recents. */
function LookupOffer({
  query,
  isCvu,
  disabled,
  onLookup,
}: {
  query: string;
  isCvu: boolean;
  disabled: boolean;
  onLookup: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onLookup}
      disabled={disabled}
      className="mt-6 flex min-h-16 w-full items-center gap-4 rounded-2xl bg-surface px-4 py-3 text-left inset-shadow-recessed transition hover:bg-surface/80 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none disabled:opacity-60"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <SearchIcon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] font-medium break-all text-foreground">
          Buscar «{query}»
        </span>
        <span className="text-xs text-muted">
          {isCvu ? "CVU de otra cuenta" : "Alias de otra cuenta"}
        </span>
      </span>
    </button>
  );
}
