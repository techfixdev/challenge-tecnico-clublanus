import { ROUTES } from "@/shared/lib/routes";

import { previewRecipient, type TransferRepository } from "./transfer";
import type { ConfirmedRecipient } from "./transfer-form";
import { checkTransferRecipient } from "./transfer-rules";

/**
 * Opening the send flow already addressed to someone ("Repetir transferencia" on a sent
 * movement): `/transferir?to=<alias>`.
 *
 * The URL is user input like any other: anyone can type it or share it. So the page never
 * shows what it says. The value must be a well-formed alias (the transfer rules), and the
 * server then resolves it exactly like the recipient step's lookup does (an existing
 * account, not the user's own) before the flow may skip that step. Only aliases travel in
 * links: a full CVU never goes into a URL (history, logs, referrers).
 */
export const TRANSFER_TO_PARAM = "to";

/** "/transferir?to=hincha.granate". */
export function transferToHref(alias: string): string {
  return `${ROUTES.transfer}?${TRANSFER_TO_PARAM}=${encodeURIComponent(alias)}`;
}

/** The normalized alias in `?to=`, or null for anything else (missing, repeated, a CVU). */
export function parseTransferTo(
  raw: string | string[] | undefined,
): string | null {
  if (typeof raw !== "string") return null;
  const checked = checkTransferRecipient(raw);
  return checked.ok && checked.key.kind === "alias" ? checked.key.alias : null;
}

/**
 * How the flow starts from a `?to=` link:
 * - `confirmed`: the server found the account, so the flow opens on the amount step;
 * - `typed`: it did not (no such alias, or the user's own), so the alias is only typed into
 *   the first step, where "Continuar" explains why it cannot be used.
 */
export type TransferPrefill =
  | { kind: "confirmed"; recipient: ConfirmedRecipient }
  | { kind: "typed"; text: string };

/** Use case: resolve `?to=` for the send page; null when there is nothing usable. */
export async function resolveTransferPrefill(
  repository: TransferRepository,
  userId: string,
  raw: string | string[] | undefined,
): Promise<TransferPrefill | null> {
  const alias = parseTransferTo(raw);
  if (!alias) return null;
  const result = await previewRecipient(repository, userId, alias);
  if (!result.ok) return { kind: "typed", text: alias };
  return {
    kind: "confirmed",
    recipient: { ...result.recipient, query: alias },
  };
}
