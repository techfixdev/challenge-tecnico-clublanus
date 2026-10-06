/**
 * The currencies GranaBank accounts operate in. A card holds one of them; money never
 * converts between them (no FX), so amounts in different currencies are never added.
 * The database stores the ISO 4217 code as text, hence the `string` fallbacks below.
 */
export const CURRENCIES = ["USD", "ARS"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isCurrency(code: string): code is Currency {
  return (CURRENCIES as readonly string[]).includes(code);
}

/**
 * As Argentine banks print them: "$" is the peso and "US$" the dollar, so a peso amount
 * is never mistaken for a dollar one.
 */
const SYMBOL: Record<Currency, string> = { USD: "US$", ARS: "$" };

/** Singular / plural names, for screen readers. */
const NAME: Record<Currency, { one: string; other: string }> = {
  USD: { one: "dólar", other: "dólares" },
  ARS: { one: "peso", other: "pesos" },
};

/** "US$", "$"; the ISO code itself for a currency the app does not know. */
export function currencySymbol(code: string): string {
  return isCurrency(code) ? SYMBOL[code] : code;
}

/** "dólares", "peso"; the ISO code itself for a currency the app does not know. */
export function currencyName(code: string, plural: boolean): string {
  if (!isCurrency(code)) return code;
  return plural ? NAME[code].other : NAME[code].one;
}
