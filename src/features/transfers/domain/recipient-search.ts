import { normalizeCvu } from "@/features/account/domain/account-identifiers";

import type { ConfirmedRecipient } from "./transfer-form";
import { checkTransferRecipient } from "./transfer-rules";

/**
 * The recipient step's one search field: it narrows the recent recipients while the user
 * types, and when the text is an alias or CVU of someone else it offers to look that
 * account up on the server. All local: the recents are already on the page.
 */

/** "  Sofía  NÚÑEZ " → "sofia nunez": case, accents and spacing do not count. */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** The CVU digits a recent shows ("•• … 0255" → "0255"): the browser never has more. */
function visibleCvuDigits(recipient: ConfirmedRecipient): string {
  return recipient.cvuMasked?.replace(/\D/g, "") ?? "";
}

function matches(recipient: ConfirmedRecipient, query: string): boolean {
  if (
    fold(recipient.fullName).includes(query) ||
    fold(recipient.alias ?? "").includes(query)
  ) {
    return true;
  }
  // Typed digits (spaces and dashes aside) can be the CVU's visible end.
  const digits = normalizeCvu(query);
  return /^\d+$/.test(digits) && visibleCvuDigits(recipient).includes(digits);
}

/**
 * The recents that match what is typed, in their order (newest first): by name or alias,
 * ignoring case and accents, or by the CVU's last digits. Nothing typed keeps them all.
 */
export function matchRecipients(
  query: string,
  recents: readonly ConfirmedRecipient[],
): ConfirmedRecipient[] {
  const folded = fold(query);
  if (!folded) return [...recents];
  return recents.filter((recipient) => matches(recipient, folded));
}

export type RecipientSearch = {
  matches: ConfirmedRecipient[];
  /**
   * The alias or CVU to look up (normalized, as the server reads it), when the text is a
   * well-formed one that is not a recent's own alias; null otherwise.
   */
  lookup: string | null;
};

/**
 * What the search field offers for `query`: the matching recents, and a lookup when the
 * text could be someone else. A lookup is offered even next to partial matches: the
 * alias "hincha" must stay reachable when a recent is "hincha.granate".
 */
export function searchRecipients(
  query: string,
  recents: readonly ConfirmedRecipient[],
): RecipientSearch {
  const found = matchRecipients(query, recents);
  const checked = checkTransferRecipient(query);
  if (!checked.ok) return { matches: found, lookup: null };
  const { key } = checked;
  if (key.kind === "cvu") return { matches: found, lookup: key.cvu };
  const isRecent = recents.some(
    (recipient) => recipient.alias?.toLowerCase() === key.alias,
  );
  return { matches: found, lookup: isRecent ? null : key.alias };
}
