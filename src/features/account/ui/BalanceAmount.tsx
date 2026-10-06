"use client";

import { formatAmount } from "@/shared/lib/format";

import { useCountUp } from "./useCountUp";

/**
 * A card balance. Sighted users see it count up; screen readers get the final value from
 * a separate text, so the animation never reads out a stream of intermediate numbers.
 */
export function BalanceAmount({ balance }: { balance: string }) {
  const animated = useCountUp(balance);
  return (
    <span
      data-testid="balance-amount"
      className="text-[26px] leading-none font-medium tabular-nums"
    >
      <span aria-hidden="true">{animated}</span>
      <span className="sr-only">{formatAmount(balance)}</span>
    </span>
  );
}
