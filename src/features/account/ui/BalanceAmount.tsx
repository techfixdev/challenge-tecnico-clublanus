"use client";

import { formatAmount } from "@/shared/lib/format";

import { useBalanceHidden } from "./BalanceVisibility";
import { useCountUp } from "./useCountUp";

const MASK = "••••••";

/**
 * A card balance. Sighted users see it count up (or a mask when hidden); screen readers
 * get the final value, or "Saldo oculto", from a separate text, so the animation never
 * reads out a stream of intermediate numbers.
 */
export function BalanceAmount({ balance }: { balance: string }) {
  const hidden = useBalanceHidden();
  const animated = useCountUp(balance);
  return (
    <span
      data-testid="balance-amount"
      className="text-[26px] leading-none font-medium tabular-nums"
    >
      <span aria-hidden="true">{hidden ? MASK : animated}</span>
      <span className="sr-only">
        {hidden ? "Saldo oculto" : formatAmount(balance)}
      </span>
    </span>
  );
}
