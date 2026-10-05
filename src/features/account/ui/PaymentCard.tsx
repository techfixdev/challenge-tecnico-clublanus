import { formatAmount } from "@/shared/lib/format";

import {
  describeCard,
  formatCardExpiry,
  type Card,
  type CardBrand,
} from "../domain/card";
import { CardBrandLogo } from "./CardBrandLogo";

/** Granate for the Mastercard (as in the design); the peeking Visa card is a soft pink. */
const BRAND_THEME: Record<CardBrand, { card: string; label: string }> = {
  MASTERCARD: { card: "bg-primary text-white", label: "text-white/75" },
  VISA: {
    card: "bg-card-pink text-primary-dark",
    label: "text-primary-dark/70",
  },
};

export function PaymentCard({ card }: { card: Card }) {
  const theme = BRAND_THEME[card.brand];
  return (
    <section
      aria-label={describeCard(card)}
      data-brand={card.brand}
      className={`flex h-[180px] flex-col justify-between rounded-3xl p-5 shadow-[0_12px_24px_-12px_rgb(122_29_45/0.45)] ${theme.card}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs ${theme.label}`}>Balance</p>
          <p className="mt-2 flex items-center gap-3">
            <span className="rounded-md bg-gradient-to-br from-[#fff3c4] via-[#f4c95d] to-[#d99a2b] px-2 py-1 text-[10px] font-semibold tracking-wide text-[#6b4300] shadow-sm">
              USD
            </span>
            <span className="text-[26px] leading-none font-medium tabular-nums">
              {formatAmount(card.balance)}
            </span>
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
