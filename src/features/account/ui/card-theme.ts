import type { CardBrand } from "../domain/card";

/**
 * Official granate for the Mastercard; the peeking Visa card is a soft pink on the same hue.
 * Each base color carries a soft light from the top-left and a slightly deeper bottom
 * edge, plus a hairline inner highlight, so the card reads as a material, not a flat
 * fill, while the base color stays the design's. Shared by both faces of a card.
 */
export const BRAND_THEME: Record<
  CardBrand,
  { card: string; label: string; eye: string }
> = {
  MASTERCARD: {
    card: "bg-primary bg-[radial-gradient(130%_110%_at_0%_0%,rgb(255_255_255/0.16),transparent_55%),linear-gradient(155deg,transparent_45%,color-mix(in_srgb,var(--color-primary-deep)_35%,transparent))] text-white",
    label: "text-white/75",
    eye: "text-white/75 hover:text-white focus-visible:ring-white/70",
  },
  VISA: {
    card: "bg-card-pink bg-[radial-gradient(130%_110%_at_0%_0%,rgb(255_255_255/0.5),transparent_55%),linear-gradient(155deg,transparent_45%,color-mix(in_srgb,var(--color-primary)_12%,transparent))] text-primary-dark",
    label: "text-primary-dark/70",
    eye: "text-primary-dark/70 hover:text-primary-dark focus-visible:ring-primary-dark/40",
  },
};

/** The hairline inner highlight both faces share. */
export const CARD_EDGE =
  "shadow-[inset_0_1px_0_rgb(255_255_255/0.22),inset_0_0_0_1px_rgb(255_255_255/0.06)]";
