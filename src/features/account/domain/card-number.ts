import type { CardBrand } from "./card";

/**
 * Card numbers (PANs) for the demo cards. They are fictitious: built from a seed, not
 * issued by any network, yet shaped like real ones (16 digits, the brand's leading
 * digits, a valid Luhn check digit) so the revealed number reads like a real card.
 * Framework-free: the seed builds them and the tests check them.
 */

/** Luhn (mod 10) check, as card networks use it. Digits only. */
export function isLuhnValid(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  return luhnSum(digits) % 10 === 0;
}

/** Sum of the Luhn algorithm: every second digit from the right is doubled. */
function luhnSum(digits: string): number {
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum;
}

/** Leading digits per brand: Visa numbers start with 4, Mastercard with 51–55. */
const BRAND_PREFIX: Record<CardBrand, string> = {
  VISA: "45",
  MASTERCARD: "54",
};

/** FNV-1a: a small, stable string hash, enough to spread the seed over the digits. */
function hash(seed: string): number {
  let value = 0x811c9dc5;
  for (const char of seed) {
    value ^= char.codePointAt(0)!;
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value;
}

/**
 * A 16-digit, Luhn-valid demo number of `brand` ending in `last4`, deterministic per
 * `seed`. The last 4 digits are fixed (the card already shows them), so the Luhn check
 * is satisfied by the digit just before them: it sits in a position Luhn does not
 * double, so it shifts the sum by exactly its own value.
 */
export function buildDemoPan(
  brand: CardBrand,
  last4: string,
  seed: string,
): string {
  if (!/^\d{4}$/.test(last4)) throw new Error(`Invalid last4: ${last4}`);
  let state = hash(`${brand}:${last4}:${seed}`);
  let body = BRAND_PREFIX[brand];
  while (body.length < 11) {
    // Linear congruential steps: deterministic digits from the hash.
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    body += String(state % 10);
  }
  const withoutCheck = `${body}0${last4}`;
  const check = (10 - (luhnSum(withoutCheck) % 10)) % 10;
  return `${body}${check}${last4}`;
}

/** The number in four groups of four, as printed on a card. */
export function formatCardNumber(pan: string): string[] {
  return pan.match(/\d{1,4}/g) ?? [];
}

/**
 * One hidden group of four digits. Bullets (U+2022), not asterisks: it is how banks and
 * wallets print a masked PAN, and a bullet sits on the digits' optical center, so the
 * masked number keeps the revealed one's line. Four of them, so the masked number keeps
 * the 4-4-4-4 grouping and revealing it changes only the characters.
 */
const MASKED_GROUP = "••••";

/**
 * The number before it is revealed: three masked groups and the last 4.
 * It renders on Home, so it never throws: the stored last 4 is shown as it is.
 */
export function formatMaskedCardNumber(last4: string): string[] {
  return [MASKED_GROUP, MASKED_GROUP, MASKED_GROUP, last4];
}

/** Whether a group from `formatMaskedCardNumber` hides its digits (vs. the last 4). */
export function isMaskedGroup(group: string): boolean {
  return group === MASKED_GROUP;
}
