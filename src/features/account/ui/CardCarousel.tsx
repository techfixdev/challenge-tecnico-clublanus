import type { Card } from "../domain/card";
import { BalanceVisibilityProvider } from "./BalanceVisibility";
import { CardDeck } from "./CardDeck";
import { LivingCard } from "./LivingCard";
import { PaymentCard } from "./PaymentCard";

/**
 * Home card carousel. The cards themselves stay server-rendered; the client islands only
 * add behavior around them: `CardDeck` (scroll-linked depth and the dots) and
 * `LivingCard` (tilt, sheen and shadow under the finger).
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
      <p className="mx-6 rounded-3xl bg-surface lit-surface p-6 text-sm text-muted shadow-card">
        Todavía no tenés tarjetas asociadas.
      </p>
    );
  }

  return (
    <BalanceVisibilityProvider initialHidden={balanceHidden}>
      <CardDeck
        label="Tus tarjetas"
        slides={cards.map((card) => ({
          id: card.id,
          content: (
            <LivingCard
              tone={card.brand === "VISA" ? "pink" : "primary"}
              sweep={card.isPrimary}
            >
              <PaymentCard card={card} />
            </LivingCard>
          ),
        }))}
      />
    </BalanceVisibilityProvider>
  );
}
