import type { CardBrand } from "../domain/card";

/**
 * The club's two colors: official granate for the Mastercard, satin gold for the Visa
 * (the crest's pairing). Gold, not a dark card, because Visa's blue wordmark is never
 * recolored and needs a light surface (AA on every stop, see brand-palette.test.ts).
 * Each base color carries a soft light from the top-left and a slightly deeper bottom
 * edge, plus a hairline inner highlight, so the card reads as a material, not a flat
 * fill. The currency chip takes the other club color: gold on granate, granate on gold.
 * Shared by both faces of a card: `card` paints the art layer (it tilts in 3D), `ink`
 * colors the flat text layer above it.
 */
export const BRAND_THEME: Record<
  CardBrand,
  { card: string; ink: string; label: string; eye: string; chip: string }
> = {
  MASTERCARD: {
    card: "bg-primary bg-[radial-gradient(130%_110%_at_0%_0%,rgb(255_255_255/0.16),transparent_55%),linear-gradient(155deg,transparent_45%,color-mix(in_srgb,var(--color-primary-deep)_35%,transparent))]",
    ink: "text-white",
    label: "text-white/75",
    eye: "text-white/75 hover:text-white focus-visible:ring-white/70",
    // The club's gold (Pantone 618 C), lit from the top-left like every fill; its ink
    // keeps 5.2:1 on the darkest stop (the official gold itself).
    chip: "bg-linear-155 from-gold-light via-gold-bright via-45% to-gold text-gold-ink inset-shadow-specular-gold",
  },
  VISA: {
    // Its darkest stop is `card-gold-shade` itself, the surface the AA pairs check.
    card: "bg-card-gold bg-[radial-gradient(130%_110%_at_0%_0%,rgb(255_255_255/0.45),transparent_55%),linear-gradient(155deg,transparent_45%,var(--color-card-gold-shade))]",
    ink: "text-gold-ink",
    label: "text-card-gold-label",
    eye: "text-card-gold-label hover:text-gold-ink focus-visible:ring-gold-ink/40",
    // Granate on gold: white keeps 9.8:1 on its lightest stop.
    chip: "bg-linear-155 from-primary-glow to-primary text-white inset-shadow-specular",
  },
};

/** The hairline inner highlight both faces share. */
export const CARD_EDGE =
  "shadow-[inset_0_1px_0_rgb(255_255_255/0.22),inset_0_0_0_1px_rgb(255_255_255/0.06)]";
