import {
  isValidAlias,
  isValidCvu,
  normalizeAlias,
  normalizeCvu,
} from "@/features/account/domain/account-identifiers";
import { parseAmount } from "@/shared/lib/money";

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
  amountTooLarge: "El monto máximo por transferencia es $100,000",
  descriptionInvalid: "El motivo tiene que ser un texto",
  descriptionTooLong: "El motivo puede tener hasta 60 caracteres",
  cardInvalid: "Elegí una tarjeta válida",
  idempotencyKeyInvalid:
    "Falta la clave de idempotencia (un UUID por intento de transferencia)",
} as const;

/** Per-transfer cap: US$ 100,000.00. A sanity limit, well inside `Decimal(12,2)`. */
export const MAX_TRANSFER_CENTS = 100_000_00;
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

/** An amount as typed ("12,30" or "12.30") or sent as a number: format and limits. */
export function checkTransferAmount(
  raw: string | number,
): Checked<{ amount: string; cents: number }> {
  const parsed = parseAmount(raw);
  if (!parsed) return { ok: false, message: TRANSFER_MESSAGES.amountInvalid };
  if (parsed.cents === 0) {
    return { ok: false, message: TRANSFER_MESSAGES.amountPositive };
  }
  if (parsed.cents > MAX_TRANSFER_CENTS) {
    return { ok: false, message: TRANSFER_MESSAGES.amountTooLarge };
  }
  return { ok: true, ...parsed };
}
