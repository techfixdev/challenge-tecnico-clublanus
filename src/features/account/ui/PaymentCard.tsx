import { Fragment } from "react";

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

const NUMBER_GROUPS = ["****", "****", "****"] as const;

/**
 * The card number as four evenly spaced groups. Poppins draws "*" as a superscript: its
 * 0.35em of ink hangs from the digits' cap line (the digits are 0.7em tall), so the
 * masked groups drop 0.175em to sit centered on the digits. A transform keeps that
 * offset sub-pixel instead of snapping it to whole pixels. The spaces between groups
 * keep the text "**** **** **** 1234" while the flex gap does the spacing.
 */
function CardNumber({ last4 }: { last4: string }) {
  return (
    <p
      aria-hidden="true"
      data-testid="card-number"
      className="flex gap-[0.5em] text-lg tracking-[0.18em]"
    >
      {NUMBER_GROUPS.map((group, index) => (
        <Fragment key={index}>
          <span data-masked="" className="translate-y-[0.175em]">
            {group}
          </span>{" "}
        </Fragment>
      ))}
      <span>{last4}</span>
    </p>
  );
}

export function PaymentCard({ card }: { card: Card }) {
  const theme = BRAND_THEME[card.brand];
  // The wrapper is the size container the whole card scales from (see `card-scale` in
  // globals.css); its height follows the width (180px at 390px, the design's shape).
  return (
    <div className="card-scale">
      <section
        aria-label={describeCard(card)}
        data-brand={card.brand}
        className={`flex h-[calc(var(--card-px,1px)*180)] flex-col justify-between rounded-3xl p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.22),inset_0_0_0_1px_rgb(255_255_255/0.06)] ${theme.card}`}
      >
        <div className="flex items-start justify-between">
          <div>
            {/* The eye toggle hides every balance; it lives on the primary card only. */}
            <div className="flex items-center gap-2">
              <p className={`text-xs ${theme.label}`}>Balance</p>
              {card.isPrimary && <BalanceToggle />}
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
              <BalanceAmount balance={card.balance} currency={card.currency} />
            </p>
          </div>
          <CardBrandLogo brand={card.brand} />
        </div>

        {/* Decorative (the region name carries the last 4); see CardNumber. */}
        <CardNumber last4={card.last4} />

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
