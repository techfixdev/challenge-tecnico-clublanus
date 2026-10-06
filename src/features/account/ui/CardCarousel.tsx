import type { Card } from "../domain/card";
import { BalanceVisibilityProvider } from "./BalanceVisibility";
import { PaymentCard } from "./PaymentCard";

/**
 * Horizontal carousel with CSS scroll-snap only (no JS): the next card peeks from the right,
 * as in the design, and the list scrolls natively with touch, trackpad or keyboard.
 */
export function CardCarousel({
  cards,
  balanceHidden,
}: {
  cards: Card[];
  /** The user's "Ocultar saldo" choice, read from its cookie on the server. */
  balanceHidden: boolean;
}) {
  if (cards.length === 0) {
    return (
      <p className="mx-6 rounded-3xl bg-surface p-6 text-sm text-muted shadow-card">
        Todavía no tenés tarjetas asociadas.
      </p>
    );
  }

  return (
    <BalanceVisibilityProvider initialHidden={balanceHidden}>
      <ul
        aria-label="Tus tarjetas"
        tabIndex={0}
        className="flex snap-x snap-mandatory scroll-px-6 [scrollbar-width:none] gap-4 overflow-x-auto px-6 pt-2 pb-8 focus-visible:outline-none"
      >
        {cards.map((card) => (
          <li key={card.id} className="w-[84%] shrink-0 snap-start">
            <PaymentCard card={card} />
          </li>
        ))}
      </ul>
    </BalanceVisibilityProvider>
  );
}
