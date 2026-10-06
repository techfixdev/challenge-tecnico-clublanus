import { describeCard, formatCardExpiry, type CardFace } from "../domain/card";
import { CardBrandLogo } from "./CardBrandLogo";
import {
  CardRevealToggle,
  RevealedBalance,
  RevealedCardNumber,
} from "./CardReveal";
import { BRAND_THEME, CARD_EDGE } from "./card-theme";

/**
 * The front of a payment card. It renders from the card's face only (no balance): the
 * balance and the full number arrive when the user reveals this card with its eye
 * (see CardReveal), so it must sit inside a CardRevealProvider.
 */
export function PaymentCard({ card }: { card: CardFace }) {
  const theme = BRAND_THEME[card.brand];
  // The wrapper is the size container the whole card scales from (see `card-scale` in
  // globals.css); its height follows the width (180px at 390px, the design's shape).
  return (
    <div className="card-scale">
      <section
        aria-label={describeCard(card)}
        data-brand={card.brand}
        className={`flex h-[calc(var(--card-px,1px)*180)] flex-col justify-between rounded-3xl p-5 ${CARD_EDGE} ${theme.card}`}
      >
        <div className="flex items-start justify-between">
          <div>
            {/* Every card has its own eye; it reveals only this card's data. */}
            <div className="flex items-center gap-2">
              <p className={`text-xs ${theme.label}`}>Balance</p>
              <CardRevealToggle className={theme.eye} />
            </div>
            {/* The odometer's 1.15em row leaves the digits' ink 1.25px above its center;
              the chip follows the ink, so it sits centered on the figures. */}
            <p className="mt-2 flex items-center gap-3">
              {/* Decorative for screen readers: the balance says its currency in words. */}
              <span
                aria-hidden="true"
                className="-translate-y-[calc(var(--card-px,1px)*1.25)] rounded-md bg-gradient-to-br from-[#fff3c4] via-[#f4c95d] to-[#d99a2b] px-2 py-1 text-[length:calc(var(--card-px,1px)*10)] font-semibold tracking-wide text-[#6b4300] shadow-sm"
              >
                {card.currency}
              </span>
              <RevealedBalance currency={card.currency} />
            </p>
          </div>
          <CardBrandLogo brand={card.brand} />
        </div>

        <RevealedCardNumber last4={card.last4} />

        <div className="flex items-end justify-between">
          <p className="text-sm">{card.holderName}</p>
          <p className="text-right">
            <span
              className={`block text-[length:calc(var(--card-px,1px)*9)] ${theme.label}`}
            >
              Exp. Date
            </span>
            <span className="block text-xs">
              {formatCardExpiry(card.expMonth, card.expYear)}
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
