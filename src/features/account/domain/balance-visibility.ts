/**
 * "Ocultar saldo" preference. It is stored in a cookie (not localStorage) so the server
 * renders the hidden state directly: a balance the user chose to hide never flashes on
 * load, and server and client render the same markup (no hydration mismatch).
 * Not sensitive (a UI preference), so it is readable by JavaScript, which sets it.
 */

export const BALANCE_HIDDEN_COOKIE = "granabank-balance-hidden";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function isBalanceHidden(cookieValue: string | undefined): boolean {
  return cookieValue === "1";
}

/** `document.cookie` assignment for the preference. */
export function balanceHiddenCookie(hidden: boolean): string {
  return `${BALANCE_HIDDEN_COOKIE}=${hidden ? "1" : "0"}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}
