import "server-only";

import { cookies } from "next/headers";

import {
  BALANCE_HIDDEN_COOKIE,
  isBalanceHidden,
} from "../domain/balance-visibility";

/** The user's "Ocultar saldo" choice, so Home renders it from the first byte. */
export async function readBalanceHidden(): Promise<boolean> {
  return isBalanceHidden((await cookies()).get(BALANCE_HIDDEN_COOKIE)?.value);
}
