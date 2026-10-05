"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import { CloseIcon, SearchIcon } from "@/shared/ui/icons";

import {
  SEARCH_MAX_LENGTH,
  buildMovementsHref,
  type MovementFilters,
} from "../domain/movement-filters";

export const SEARCH_DEBOUNCE_MS = 300;

type MovementSearchProps = {
  /** Filters currently applied (from the URL, parsed on the server). */
  filters: MovementFilters;
  autoFocus?: boolean;
};

/**
 * Search box that writes the query to the URL. The server reads it and filters in the
 * database, so this component only owns the text being typed:
 * - debounced (~300ms) so we navigate once per pause, not once per keystroke;
 * - `router.replace` (not push) so typing does not flood the back-button history;
 * - inside a transition, so the current list stays interactive and `isPending` drives
 *   a subtle spinner while the new results stream in.
 */
export function MovementSearch({
  filters,
  autoFocus = false,
}: MovementSearchProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const urlQuery = filters.query ?? "";
  const [value, setValue] = useState(urlQuery);
  const [isFocused, setIsFocused] = useState(false);

  // The URL can change from elsewhere (back button, "Limpiar filtros"). Adopt it unless the
  // user is typing, so their in-progress text is never overwritten mid-word.
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    if (!isFocused) setValue(urlQuery);
  }

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function navigate(text: string) {
    clearTimeout(debounceRef.current);
    const query = text.trim() || undefined;
    if (query === filters.query) return;
    startTransition(() => {
      router.replace(buildMovementsHref({ query, type: filters.type }), {
        scroll: false,
      });
    });
  }

  function handleChange(text: string) {
    setValue(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate(text), SEARCH_DEBOUNCE_MS);
  }

  function handleClear() {
    setValue("");
    inputRef.current?.focus();
    navigate("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(value);
  }

  return (
    <form role="search" onSubmit={handleSubmit} aria-busy={isPending}>
      <div className="flex h-14 items-center gap-3 rounded-2xl bg-surface px-4 shadow-card focus-within:ring-4 focus-within:ring-primary/20">
        {isPending ? (
          <span
            aria-hidden="true"
            className="size-5 shrink-0 animate-spin rounded-full border-2 border-primary/25 border-t-primary"
          />
        ) : (
          <SearchIcon className="size-5 shrink-0 text-muted" />
        )}
        <label htmlFor="movement-search" className="sr-only">
          Buscar movimientos
        </label>
        <input
          ref={inputRef}
          id="movement-search"
          type="search"
          name="q"
          value={value}
          maxLength={SEARCH_MAX_LENGTH}
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Ingresá un nombre o servicio"
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-xs placeholder:text-muted [&::-webkit-search-cancel-button]:appearance-none"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Borrar búsqueda"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-background hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
          >
            <CloseIcon className="size-4" />
          </button>
        )}
      </div>
    </form>
  );
}
