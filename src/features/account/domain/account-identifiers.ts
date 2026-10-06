/**
 * Account identifiers used to receive transfers, Argentine style:
 * - alias: 6 to 20 letters, digits, dots or hyphens ("soy.granate.lanus"), case-insensitive;
 * - CVU: 22 digits in two blocks (7-digit entity + check digit, 13-digit account + check
 *   digit), the same check-digit scheme as a bank CBU, so a mistyped digit is caught here
 *   instead of becoming "account not found".
 * Framework-free; the database repeats the format checks as CHECK constraints.
 */

const ALIAS_PATTERN = /^[a-z0-9.-]{6,20}$/;
const CVU_LENGTH = 22;

export function normalizeAlias(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidAlias(alias: string): boolean {
  return ALIAS_PATTERN.test(alias);
}

/** Pasted CVUs often come grouped ("0000 0031 …") or with dashes. */
export function normalizeCvu(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

const ENTITY_WEIGHTS = [7, 1, 3, 9, 7, 1, 3];
const ACCOUNT_WEIGHTS = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3];

function checkDigit(digits: string, weights: readonly number[]): number {
  const sum = weights.reduce(
    (total, weight, index) => total + weight * Number(digits[index]),
    0,
  );
  return (10 - (sum % 10)) % 10;
}

export function isValidCvu(cvu: string): boolean {
  if (!new RegExp(`^\\d{${CVU_LENGTH}}$`).test(cvu)) return false;
  const entity = cvu.slice(0, 8);
  const account = cvu.slice(8);
  return (
    checkDigit(entity, ENTITY_WEIGHTS) === Number(entity[7]) &&
    checkDigit(account, ACCOUNT_WEIGHTS) === Number(account[13])
  );
}

/** Appends both check digits: entity (7 digits) + account number (13 digits) → CVU. */
export function buildCvu(entity: string, account: string): string {
  if (!/^\d{7}$/.test(entity) || !/^\d{13}$/.test(account)) {
    throw new RangeError("A CVU needs a 7-digit entity and a 13-digit account");
  }
  return `${entity}${checkDigit(entity, ENTITY_WEIGHTS)}${account}${checkDigit(account, ACCOUNT_WEIGHTS)}`;
}

function groupForReading(value: string): string {
  return value.replace(/(.{4})(?=.)/g, "$1 ");
}

/** "2850 5909 4009 0418 1352 01": easier to read aloud or compare. */
export function formatCvu(cvu: string): string {
  return groupForReading(cvu);
}

/** Only the last 4 digits: enough to confirm a recipient without exposing the account. */
export function maskCvu(cvu: string): string {
  return groupForReading("•".repeat(cvu.length - 4) + cvu.slice(-4));
}

export type ReceiveDetails = {
  holderName: string;
  alias: string;
  /** Raw 22 digits, for copying. */
  cvu: string;
  /** Grouped in fours, for display. */
  cvuFormatted: string;
};

export type AccountIdentifiersRow = {
  firstName: string;
  lastName: string;
  alias: string | null;
  cvu: string | null;
};

export interface ReceiveDetailsRepository {
  findByUserId(userId: string): Promise<AccountIdentifiersRow | null>;
}

/** Use case: what the Receive screen shows (and shares) so others can send money. */
export async function getReceiveDetails(
  repository: ReceiveDetailsRepository,
  userId: string,
): Promise<ReceiveDetails | null> {
  const row = await repository.findByUserId(userId);
  if (!row?.alias || !row.cvu) return null;
  return {
    holderName: `${row.firstName} ${row.lastName}`,
    alias: row.alias,
    cvu: row.cvu,
    cvuFormatted: formatCvu(row.cvu),
  };
}

/** What "Compartir" sends (or copies): the raw CVU, so it pastes cleanly anywhere. */
export function receiveShareText(details: ReceiveDetails): string {
  return [
    "Te paso mis datos de GranaBank para que me transfieras:",
    `Titular: ${details.holderName}`,
    `Alias: ${details.alias}`,
    `CVU: ${details.cvu}`,
  ].join("\n");
}
