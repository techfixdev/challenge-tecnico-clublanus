import { cardPhrase, type CardFace } from "../domain/card";
import { CardBrandLogo } from "./CardBrandLogo";
import { CardRevealToggle, RevealedCvv } from "./CardReveal";
import { BRAND_THEME, CARD_EDGE } from "./card-theme";

/** Card-pixel length: 1px at the 390px design width, scaling with the card. */
const px = (value: number) => `calc(var(--card-px,1px)*${value})`;

/**
 * The back of a payment card, shown by flipping it: magnetic stripe, signature panel with
 * the holder's name, CVV box (masked until the card is revealed; its own eye reveals it
 * too) and the brand mark. Same size, tone and scaling as the front. The stripe runs
 * edge to edge, so the face has no side padding; its rows carry it instead.
 */
export function PaymentCardBack({ card }: { card: CardFace }) {
  const theme = BRAND_THEME[card.brand];
  return (
    <div className="card-scale">
      <section
        aria-label={`Reverso de la ${cardPhrase(card)}`}
        data-brand={card.brand}
        data-face="back"
        style={{ height: px(180), paddingTop: px(18) }}
        // Small labels unhinted, as the scaled front does (hinting opens gaps in words).
        className={`flex flex-col rounded-3xl pb-5 [text-rendering:geometricPrecision] ${CARD_EDGE} ${theme.card}`}
      >
        <div
          aria-hidden="true"
          data-testid="card-stripe"
          style={{ height: px(34) }}
          className="shrink-0 bg-[linear-gradient(180deg,var(--color-card-stripe-edge),var(--color-card-stripe)_70%,var(--color-card-stripe-low))]"
        />

        <div className="mt-3 flex items-center justify-between px-5">
          <span style={{ fontSize: px(9) }} className={theme.label}>
            Firma autorizada
          </span>
          <span className="flex items-center gap-2">
            <span style={{ fontSize: px(9) }} className={theme.label}>
              CVV
            </span>
            <CardRevealToggle className={theme.eye} />
          </span>
        </div>

        <div className="mt-1 flex gap-2 px-5">
          {/* The signature strip: decorative (the front already names the holder). */}
          <p
            aria-hidden="true"
            style={{ height: px(30) }}
            className="flex min-w-0 flex-1 items-center overflow-hidden rounded-md bg-[repeating-linear-gradient(135deg,var(--color-card-signature)_0_4px,var(--color-card-signature-line)_4px_8px)] px-2 text-sm whitespace-nowrap text-card-signature-ink italic"
          >
            {card.holderName}
          </p>
          <RevealedCvv className="flex [height:calc(var(--card-px,1px)*30)] [width:calc(var(--card-px,1px)*54)] shrink-0 items-center justify-center rounded-md bg-white text-sm font-semibold tracking-[0.12em] text-card-cvv-ink shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" />
        </div>

        <div className="mt-auto flex items-end justify-between px-5">
          <p style={{ fontSize: px(10) }} className={theme.label}>
            Tocá para volver
          </p>
          <CardBrandLogo brand={card.brand} />
        </div>
      </section>
    </div>
  );
}
