import {
  isValidAlias,
  isValidCvu,
  normalizeAlias,
  normalizeCvu,
} from "@/features/account/domain/account-identifiers";
import { isCurrency, type Currency } from "@/shared/lib/currency";
import { formatMoney } from "@/shared/lib/format";
import { parseAmount, parseCanonicalAmount } from "@/shared/lib/money";

/**
 * The transfer rules as plain functions, with no validation library: the send form runs
 * them while the user types (so the browser never downloads zod) and the server's schema
 * (`transfer-schema.ts`) delegates to them, so both always give the same verdict and the
 * same message. Messages are UI copy, so they are in Spanish.
 */
export const TRANSFER_MESSAGES = {
  bodyNotObject:
    "Enviá un objeto JSON con destinatario, monto y clave de idempotencia",
  recipientRequired: "Ingresá el alias o CVU de destino",
  cvuLength: "El CVU tiene 22 dígitos",
  cvuInvalid: "Revisá el CVU: algún dígito no es correcto",
  aliasInvalid:
    "El alias tiene entre 6 y 20 caracteres: letras, números, puntos o guiones",
  amountInvalid: "Ingresá un monto válido, con hasta 2 decimales",
  amountPositive: "El monto tiene que ser mayor a cero",
  amountTooLarge: "El monto supera el máximo por transferencia",
  descriptionInvalid: "El motivo tiene que ser un texto",
  descriptionTooLong: "El motivo puede tener hasta 60 caracteres",
  cardInvalid: "Elegí una tarjeta válida",
  idempotencyKeyInvalid:
    "Falta la clave de idempotencia (un UUID por intento de transferencia)",
} as const;

/**
 * Per-transfer caps, per currency: US$ 100.000 and $ 100.000.000 (pesos). Sanity limits
 * of the same order once converted, well inside `Decimal(12,2)`.
 */
export const TRANSFER_LIMIT_CENTS: Record<Currency, number> = {
  USD: 100_000_00,
  ARS: 100_000_000_00,
};
/**
 * The highest cap: all the server's schema can check before the transaction reads the
 * card (and so its currency); `planTransfer` then applies the card's own cap.
 */
export const MAX_TRANSFER_CENTS = Math.max(
  ...Object.values(TRANSFER_LIMIT_CENTS),
);

/** The cap for a card's currency; the strictest one for a currency the app does not know. */
export function transferLimitCents(currency: string): number {
  return isCurrency(currency)
    ? TRANSFER_LIMIT_CENTS[currency]
    : Math.min(...Object.values(TRANSFER_LIMIT_CENTS));
}

/** "El monto máximo por transferencia es US$ 100.000". */
export function transferLimitMessage(currency: string): string {
  return `El monto máximo por transferencia es ${formatMoney(transferLimitCents(currency) / 100, currency)}`;
}
export const DESCRIPTION_MAX_LENGTH = 60;
/** Longer text is no alias nor CVU; the cap just stops absurd input early. */
const RECIPIENT_MAX_LENGTH = 64;

/** How the sender identifies the recipient: a CVU (22 digits) or an alias. */
export type RecipientKey =
  { kind: "alias"; alias: string } | { kind: "cvu"; cvu: string };

type Checked<T> = ({ ok: true } & T) | { ok: false; message: string };

/** The alias or CVU as typed (spaces and dashes in a CVU are fine). */
export function checkTransferRecipient(
  raw: string,
): Checked<{ key: RecipientKey }> {
  const text = raw.trim();
  if (!text) return { ok: false, message: TRANSFER_MESSAGES.recipientRequired };
  if (text.length > RECIPIENT_MAX_LENGTH) {
    return { ok: false, message: TRANSFER_MESSAGES.aliasInvalid };
  }
  const digits = normalizeCvu(text);
  // Only digits (once spaces and dashes are gone) means the user typed a CVU.
  if (/^\d+$/.test(digits)) {
    if (digits.length !== 22) {
      return { ok: false, message: TRANSFER_MESSAGES.cvuLength };
    }
    if (!isValidCvu(digits)) {
      return { ok: false, message: TRANSFER_MESSAGES.cvuInvalid };
    }
    return { ok: true, key: { kind: "cvu", cvu: digits } };
  }
  const alias = normalizeAlias(text);
  if (!isValidAlias(alias)) {
    return { ok: false, message: TRANSFER_MESSAGES.aliasInvalid };
  }
  return { ok: true, key: { kind: "alias", alias } };
}

type ExactAmount = { amount: string; cents: number };

/** Positive, within the currency's cap: the one place amount limits are checked. */
function checkAmountLimits(
  parsed: ExactAmount | null,
  currency?: string,
): Checked<ExactAmount> {
  if (!parsed) return { ok: false, message: TRANSFER_MESSAGES.amountInvalid };
  if (parsed.cents === 0) {
    return { ok: false, message: TRANSFER_MESSAGES.amountPositive };
  }
  if (currency !== undefined && parsed.cents > transferLimitCents(currency)) {
    return { ok: false, message: transferLimitMessage(currency) };
  }
  if (parsed.cents > MAX_TRANSFER_CENTS) {
    return { ok: false, message: TRANSFER_MESSAGES.amountTooLarge };
  }
  return { ok: true, ...parsed };
}

/**
 * A canonical amount ("1234.56" or the JSON number 1234.56): what the domain, the
 * server's schema and the REST API accept. A dot is always the decimal point, so
 * "12.500" is refused, never read as 12500. With the card's currency the cap is that
 * currency's; without it (the schema, before reading the card) it is the highest one.
 */
export function checkTransferAmount(
  raw: string | number,
  currency?: string,
): Checked<ExactAmount> {
  return checkAmountLimits(parseCanonicalAmount(raw), currency);
}

/**
 * An amount as a person types it in the send form ("1.234,56", "12,30" or "12.30"), with
 * the same limits and messages as `checkTransferAmount`. Human input only: the form
 * sends `toCanonicalAmount` of it on, so the server never applies these rules.
 */
export function checkTypedAmount(
  raw: string,
  currency?: string,
): Checked<ExactAmount> {
  return checkAmountLimits(parseAmount(raw), currency);
}

/**
 * The typed amount as the canonical one the server accepts ("1.234,56" → "1234.56").
 * Text it cannot read goes on unchanged, for the server's schema to refuse.
 */
export function toCanonicalAmount(raw: string): string {
  return parseAmount(raw)?.amount ?? raw;
}
