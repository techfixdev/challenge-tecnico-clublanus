import { describe, expect, it } from "vitest";

import {
  BALANCE_HIDDEN_COOKIE,
  balanceHiddenCookie,
  isBalanceHidden,
} from "./balance-visibility";

describe("balance visibility preference", () => {
  it("is hidden only when the cookie says so", () => {
    expect(isBalanceHidden("1")).toBe(true);
    expect(isBalanceHidden("0")).toBe(false);
    expect(isBalanceHidden(undefined)).toBe(false);
    expect(isBalanceHidden("true")).toBe(false);
  });

  it("serializes a site-wide, long-lived, same-site cookie", () => {
    const cookie = balanceHiddenCookie(true);

    expect(cookie.startsWith(`${BALANCE_HIDDEN_COOKIE}=1;`)).toBe(true);
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=31536000");
    expect(cookie).toContain("SameSite=Lax");
    expect(balanceHiddenCookie(false)).toMatch(
      new RegExp(`^${BALANCE_HIDDEN_COOKIE}=0;`),
    );
  });
});
