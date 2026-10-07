"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import { CloseIcon, SearchIcon } from "@/shared/ui/icons";
import { announceNavigation, IN_PLACE } from "@/shared/ui/motion/navigation";
import { INPUT_TEXT_CLASS } from "@/shared/ui/input-text";

import {
  SEARCH_MAX_LENGTH,
  buildMovementsHref,
  type MovementFilters,
} from "../domain/movement-search-params";

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
 *
 * URL ↔ input sync: when the URL's query changes from outside (back button, "Limpiar
 * filtros", the nav link) the box adopts it, even while focused, because the list below
 * already shows that query; a pending search for the old text is dropped. When the change
 * is just our own search landing, the box keeps whatever the user typed since.
 */
export function MovementSearch({
  filters,
  autoFocus = false,
}: MovementSearchProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Read when the debounce fires, so a chip clicked mid-typing is respected. A layout
  // effect, not a passive one: when results land with a view transition (their reveal),
  // React runs passive effects only after it, and a tap on "Borrar búsqueda" meanwhile
  // would compare against the previous query and do nothing.
  const latestFilters = useRef(filters);
  useLayoutEffect(() => {
    latestFilters.current = filters;
  }, [filters]);

  const urlQuery = filters.query ?? "";
  const [value, setValue] = useState(urlQuery);
  const [requestedQuery, setRequestedQuery] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    if (urlQuery !== requestedQuery) {
      setRequestedQuery(urlQuery);
      setValue(urlQuery);
    }
  }

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function navigate(text: string) {
    clearTimeout(debounceRef.current);
    const { query: currentQuery, type } = latestFilters.current;
    const query = text.trim() || undefined;
    if (query === currentQuery) return;
    setRequestedQuery(query ?? "");
    announceNavigation(IN_PLACE);
    startTransition(() => {
      router.replace(buildMovementsHref({ query, type }), {
        scroll: false,
        transitionTypes: IN_PLACE,
      });
    });
  }

  function handleChange(text: string) {
    setValue(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // An outside URL change replaced the text meanwhile: that search is stale.
      if (inputRef.current?.value === text) navigate(text);
    }, SEARCH_DEBOUNCE_MS);
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
      <div className="flex h-14 items-center gap-3 rounded-2xl bg-surface px-4 inset-shadow-recessed focus-within:ring-4 focus-within:ring-primary/20">
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
          className={`h-full min-w-0 flex-1 bg-transparent ${INPUT_TEXT_CLASS} text-foreground outline-none placeholder:text-xs placeholder:text-muted [&::-webkit-search-cancel-button]:appearance-none`}
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
