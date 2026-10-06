/**
 * Per-card reveal of the sensitive data (balance, full number, CVV) as a pure state
 * machine: hidden → revealing (request in flight) → revealed → hidden again on a toggle,
 * after REVEAL_TIMEOUT_MS, or when the page is hidden. Each request carries a number, so
 * an answer that arrives after the user cancelled (or after a newer request) is dropped.
 * Hiding forgets the data: nothing sensitive stays in memory while the card is masked.
 */

/** How long revealed card data stays on screen before it masks itself again. */
export const REVEAL_TIMEOUT_MS = 30_000;

export type CardSecrets = {
  /** The full card number, digits only; null when the card has none (stays masked). */
  number: string | null;
  cvv: string;
  /** Decimal string with 2 decimals, e.g. "978.85". */
  balance: string;
};

export type RevealState =
  | { status: "hidden"; request: number; error?: true }
  | { status: "revealing"; request: number }
  | { status: "revealed"; request: number; secrets: CardSecrets };

export type RevealEvent =
  | { type: "toggle" }
  | { type: "loaded"; request: number; secrets: CardSecrets }
  | { type: "failed"; request: number }
  | { type: "expired" }
  | { type: "pageHidden" };

export const INITIAL_REVEAL_STATE: RevealState = {
  status: "hidden",
  request: 0,
};

export function revealReducer(
  state: RevealState,
  event: RevealEvent,
): RevealState {
  switch (event.type) {
    case "toggle":
      return state.status === "hidden"
        ? { status: "revealing", request: state.request + 1 }
        : { status: "hidden", request: state.request };
    case "loaded":
      return state.status === "revealing" && event.request === state.request
        ? { status: "revealed", request: state.request, secrets: event.secrets }
        : state;
    case "failed":
      return state.status === "revealing" && event.request === state.request
        ? { status: "hidden", request: state.request, error: true }
        : state;
    case "expired":
    case "pageHidden":
      return state.status === "hidden"
        ? state
        : { status: "hidden", request: state.request };
  }
}
