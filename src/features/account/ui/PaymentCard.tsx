import {
  describeCard,
  formatCardExpiry,
  type Card,
  type CardBrand,
} from "../domain/card";
import { BalanceAmount } from "./BalanceAmount";
import { BalanceToggle } from "./BalanceVisibility";
import { CardBrandLogo } from "./CardBrandLogo";

/**
 * Granate for the Mastercard (as in the design); the peeking Visa card is a soft pink.
 * Each base color carries a soft light from the top-left and a slightly deeper bottom
 * edge, plus a hairline inner highlight, so the card reads as a material, not a flat
 * fill, while the base color stays the design's.
 */
const BRAND_THEME: Record<CardBrand, { card: string; label: string }> = {
  MASTERCARD: {
    card: "bg-primary bg-[radial-gradient(130%_110%_at_0%_0%,rgb(255_255_255/0.16),transparent_55%),linear-gradient(155deg,transparent_45%,rgb(40_6_14/0.35))] text-white",
    label: "text-white/75",
  },
  VISA: {
    card: "bg-card-pink bg-[radial-gradient(130%_110%_at_0%_0%,rgb(255_255_255/0.5),transparent_55%),linear-gradient(155deg,transparent_45%,rgb(122_29_45/0.12))] text-primary-dark",
    label: "text-primary-dark/70",
  },
};

export function PaymentCard({ card }: { card: Card }) {
  const theme = BRAND_THEME[card.brand];
  return (
    <section
      aria-label={describeCard(card)}
      data-brand={card.brand}
      className={`flex h-[180px] flex-col justify-between rounded-3xl p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.22),inset_0_0_0_1px_rgb(255_255_255/0.06)] ${theme.card}`}
    >
      <div className="flex items-start justify-between">
        <div>
          {/* The eye toggle hides every balance; it lives on the primary card only. */}
          <div className="flex items-center gap-2">
            <p className={`text-xs ${theme.label}`}>Balance</p>
            {card.isPrimary && <BalanceToggle />}
          </div>
          <p className="mt-2 flex items-center gap-3">
            <span className="rounded-md bg-gradient-to-br from-[#fff3c4] via-[#f4c95d] to-[#d99a2b] px-2 py-1 text-[10px] font-semibold tracking-wide text-[#6b4300] shadow-sm">
              USD
            </span>
            <BalanceAmount balance={card.balance} />
          </p>
        </div>
        <CardBrandLogo brand={card.brand} />
      </div>

      <p aria-hidden="true" className="text-lg tracking-[0.18em] tabular-nums">
        {`**** **** **** ${card.last4}`}
      </p>

      <div className="flex items-end justify-between">
        <p className="text-sm">{card.holderName}</p>
        <p className="text-right">
          <span className={`block text-[9px] ${theme.label}`}>Exp. Date</span>
          <span className="block text-xs tabular-nums">
            {formatCardExpiry(card.expMonth, card.expYear)}
          </span>
        </p>
      </div>
    </section>
  );
}
