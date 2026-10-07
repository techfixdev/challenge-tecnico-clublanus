"use client";

import {
  createContext,
  Fragment,
  use,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";

import { EyeIcon, EyeOffIcon } from "@/shared/ui/icons";

import {
  formatCardNumber,
  formatMaskedCardNumber,
  isMaskedGroup,
} from "../domain/card-number";
import { BalanceAmount } from "./BalanceAmount";
import {
  INITIAL_REVEAL_STATE,
  REVEAL_TIMEOUT_MS,
  revealReducer,
  type CardSecrets,
  type RevealState,
} from "./card-reveal";

type CardReveal = {
  state: RevealState;
  toggle: () => void;
  /** The card in a sentence, e.g. "tarjeta Visa terminada en 5678". */
  phrase: string;
};

const CardRevealContext = createContext<CardReveal | null>(null);

function useCardReveal(): CardReveal {
  const reveal = use(CardRevealContext);
  if (!reveal) throw new Error("Card reveal parts need a CardRevealProvider");
  return reveal;
}

function useSecrets(): CardSecrets | null {
  const { state } = useCardReveal();
  return state.status === "revealed" ? state.secrets : null;
}

function isCardSecrets(data: unknown): data is CardSecrets {
  const value = data as Partial<Record<keyof CardSecrets, unknown>> | null;
  return (
    value != null &&
    (typeof value.number === "string" || value.number === null) &&
    typeof value.cvv === "string" &&
    typeof value.balance === "string"
  );
}

/** One request per reveal, never cached (the server also answers `no-store`). */
async function fetchCardSecrets(
  cardId: string,
  signal: AbortSignal,
): Promise<CardSecrets> {
  const response = await fetch(
    `/api/account/cards/${encodeURIComponent(cardId)}/details`,
    { cache: "no-store", signal, headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error(`Card details: HTTP ${response.status}`);
  const { data } = (await response.json()) as { data?: unknown };
  if (!isCardSecrets(data)) throw new Error("Card details: unexpected shape");
  return { number: data.number, cvv: data.cvv, balance: data.balance };
}

function announcement(state: RevealState): string {
  switch (state.status) {
    case "revealing":
      return "Cargando los datos de la tarjeta…";
    case "revealed":
      return `Datos visibles. Se ocultan en ${REVEAL_TIMEOUT_MS / 1000} segundos.`;
    case "hidden":
      if (state.error) return "No pudimos mostrar los datos. Probá de nuevo.";
      // Silent on load; after a reveal, say it is masked again.
      return state.request > 0 ? "Datos de la tarjeta ocultos." : "";
  }
}

/**
 * One card's reveal: balance, full number and CVV stay masked (and absent from the page)
 * until its eye is tapped; then they are fetched from the server for this card only.
 * They mask themselves again after REVEAL_TIMEOUT_MS, when the tab is hidden or the page
 * is left (unmounting forgets them). Every card has its own provider, so each eye
 * controls only its own card.
 */
export function CardRevealProvider({
  cardId,
  phrase,
  children,
}: {
  cardId: string;
  phrase: string;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(revealReducer, INITIAL_REVEAL_STATE);
  const { status, request } = state;

  useEffect(() => {
    if (status !== "revealing") return;
    const controller = new AbortController();
    fetchCardSecrets(cardId, controller.signal).then(
      (secrets) => dispatch({ type: "loaded", request, secrets }),
      () => {
        if (!controller.signal.aborted) dispatch({ type: "failed", request });
      },
    );
    return () => controller.abort();
  }, [cardId, status, request]);

  useEffect(() => {
    if (status !== "revealed") return;
    const timer = setTimeout(
      () => dispatch({ type: "expired" }),
      REVEAL_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [status, request]);

  useEffect(() => {
    const hide = () => dispatch({ type: "pageHidden" });
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hide();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", hide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", hide);
    };
  }, []);

  return (
    <CardRevealContext
      value={{ state, toggle: () => dispatch({ type: "toggle" }), phrase }}
    >
      {children}
      <span role="status" className="sr-only">
        {announcement(state)}
      </span>
    </CardRevealContext>
  );
}

/**
 * The eye of one card. A toggle button: its name says what it does for this card
 * ("Mostrar datos de la tarjeta Visa terminada en 5678") and `aria-pressed` says whether
 * the data is shown (WAI-ARIA pattern). The icon is 16px, as small as the label next to
 * it, while the pseudo-element extends the touch target to 40px without moving the
 * layout. `pointer-events-auto`: the card surface lets taps through to its flip button.
 */
export function CardRevealToggle({ className }: { className: string }) {
  const { state, toggle, phrase } = useCardReveal();
  const pressed = state.status !== "hidden";
  const Icon = pressed ? EyeIcon : EyeOffIcon;
  return (
    <button
      type="button"
      aria-label={`Mostrar datos de la ${phrase}`}
      aria-pressed={pressed}
      aria-busy={state.status === "revealing" || undefined}
      onClick={toggle}
      className={`pointer-events-auto relative flex size-4 pressable items-center justify-center rounded-full after:absolute after:-inset-[12px] focus-visible:ring-2 focus-visible:outline-none aria-busy:animate-pulse ${className}`}
    >
      <Icon className="size-full" />
    </button>
  );
}

/** The card's balance: the mask until revealed, then the odometer rolls to it. */
export function RevealedBalance({ currency }: { currency: string }) {
  const secrets = useSecrets();
  return (
    <BalanceAmount balance={secrets?.balance ?? null} currency={currency} />
  );
}

/**
 * The card number as four evenly spaced groups: masked with bullets, or the full number
 * once revealed. A bullet sits on the digits' optical center, so the masked groups need
 * no offset. The spaces between groups keep the text "•••• •••• •••• 1234" while the
 * flex gap does the spacing. Masked, it is decorative (the region name carries the last
 * 4); revealed, screen readers get the whole number from a visually hidden text.
 */
export function RevealedCardNumber({ last4 }: { last4: string }) {
  const number = useSecrets()?.number;
  // Masked until revealed, and also when the card has no stored number: the balance
  // and CVV are still revealed, the number keeps showing only its last 4.
  if (!number) {
    const groups = formatMaskedCardNumber(last4);
    return (
      <p
        aria-hidden="true"
        data-testid="card-number"
        className="flex gap-[0.5em] text-lg tracking-[0.18em]"
      >
        {groups.map((group, index) => (
          <Fragment key={index}>
            {isMaskedGroup(group) ? (
              // Bullets set tighter than digits, so each group reads as one block.
              <span data-masked="" className="tracking-[0.04em]">
                {group}
              </span>
            ) : (
              <span>{group}</span>
            )}
            {index < groups.length - 1 ? " " : null}
          </Fragment>
        ))}
      </p>
    );
  }
  const groups = formatCardNumber(number);
  // Sixteen digits are wider than twelve bullets and four digits: tighter tracking
  // and gaps keep the full number inside the card at every width.
  return (
    <p
      data-testid="card-number"
      data-revealed=""
      className="flex gap-[0.4em] text-lg tracking-[0.12em]"
    >
      {groups.map((group, index) => (
        <Fragment key={index}>
          <span aria-hidden="true">{group}</span>{" "}
        </Fragment>
      ))}
      <span className="sr-only">Número de tarjeta {groups.join(" ")}</span>
    </p>
  );
}

/** The CVV box's content: three bullets until revealed. */
export function RevealedCvv({ className }: { className: string }) {
  const secrets = useSecrets();
  return (
    <p data-testid="card-cvv" className={className}>
      <span aria-hidden="true">{secrets?.cvv ?? "•••"}</span>
      <span className="sr-only">
        {secrets
          ? `Código de seguridad ${secrets.cvv.split("").join(" ")}`
          : "Código de seguridad oculto"}
      </span>
    </p>
  );
}
