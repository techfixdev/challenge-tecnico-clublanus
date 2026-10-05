import type { CardBrand } from "../domain/card";

/** Brand marks drawn inline (from the design's component sheet). Decorative: the card region names the brand. */
function MastercardLogo() {
  return (
    <svg
      viewBox="0 0 40 24"
      className="h-6 w-10"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="14" cy="12" r="10" fill="#EB001B" />
      <circle cx="26" cy="12" r="10" fill="#F79E1B" />
      <path d="M20 4a10 10 0 0 1 0 16a10 10 0 0 1 0-16Z" fill="#FF5F00" />
    </svg>
  );
}

function VisaLogo() {
  return (
    <svg
      viewBox="0 0 48 30"
      className="h-6 w-10"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="48" height="30" rx="5" fill="#1A1F71" />
      <text
        x="24"
        y="20.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="14"
        fontStyle="italic"
        fontWeight="800"
        letterSpacing="0.5"
      >
        VISA
      </text>
    </svg>
  );
}

export function CardBrandLogo({ brand }: { brand: CardBrand }) {
  return brand === "VISA" ? <VisaLogo /> : <MastercardLogo />;
}
