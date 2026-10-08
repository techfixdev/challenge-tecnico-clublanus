/**
 * Transfer references people can read out or type: "ENV-7Q4K-92XA". The code is 8 random
 * Crockford base32 symbols (40 bits) in two groups of four; the alphabet leaves out I, L
 * and O, which read as 1 and 0, and U, so codes do not spell accidental obscenities.
 *
 * Both sides of a transfer share the code, prefixed by their side (ENV for the sender's
 * "enviada", REC for the recipient's "recibida"): each movement keeps a unique reference,
 * and both people quote the same code to support. Uniqueness is the database's job (a
 * unique index on the movement reference); a collision is retried with a new code.
 */

export const REFERENCE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const CODE_LENGTH = 8;

function cryptoRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** "7Q4K-92XA". Each byte picks one of the 32 symbols (256 is a multiple of 32: uniform). */
export function newTransferCode(
  randomBytes: (length: number) => Uint8Array = cryptoRandomBytes,
): string {
  const symbols = Array.from(
    randomBytes(CODE_LENGTH),
    (byte) => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length],
  ).join("");
  return `${symbols.slice(0, 4)}-${symbols.slice(4)}`;
}

const SIDE_PREFIX = { SENT: "ENV", RECEIVED: "REC" } as const;

/** "ENV-7Q4K-92XA" (sender) or "REC-7Q4K-92XA" (recipient). */
export function movementReference(
  code: string,
  side: keyof typeof SIDE_PREFIX,
): string {
  return `${SIDE_PREFIX[side]}-${code}`;
}
