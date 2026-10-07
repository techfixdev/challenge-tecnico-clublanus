import { cardPhrase, type CardFace } from "../domain/card";
import { CardDeck } from "./CardDeck";
import { CardRevealProvider } from "./CardReveal";
import { LivingCard } from "./LivingCard";
import { PaymentCard } from "./PaymentCard";
import { PaymentCardBack } from "./PaymentCardBack";

/**
 * Home card carousel. The cards themselves stay server-rendered from their faces (no
 * balance, no full number, no CVV: those are fetched per card on reveal); the client
 * islands only add behavior around them: `CardDeck` (scroll-linked depth and the dots),
 * `CardRevealProvider` (each card's eye) and `LivingCard` (tilt, sheen and the flip).
 */
export function CardCarousel({ cards }: { cards: CardFace[] }) {
  if (cards.length === 0) {
    return (
      <p className="mx-6 rounded-3xl bg-surface lit-surface p-6 text-sm text-muted shadow-card">
        Todavía no tenés tarjetas asociadas.
      </p>
    );
  }

  return (
    <CardDeck
      label="Tus tarjetas"
      slides={cards.map((card) => ({
        id: card.id,
        content: <CarouselCard card={card} />,
      }))}
    />
  );
}

/** One slide: the card with its own eye, tilt and flip. */
function CarouselCard({ card }: { card: CardFace }) {
  const phrase = cardPhrase(card);
  return (
    <CardRevealProvider cardId={card.id} phrase={phrase}>
      <LivingCard
        tone={card.brand === "VISA" ? "gold" : "primary"}
        flipLabel={`Ver reverso de la ${phrase}`}
        back={<PaymentCardBack card={card} />}
      >
        <PaymentCard card={card} />
      </LivingCard>
    </CardRevealProvider>
  );
}
