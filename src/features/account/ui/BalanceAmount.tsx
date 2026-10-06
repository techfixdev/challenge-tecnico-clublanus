"use client";

import * as m from "motion/react-m";
import { useState, useSyncExternalStore } from "react";

import { formatAmount } from "@/shared/lib/format";
import { INSTANT, ROLL_SPRING } from "@/shared/ui/motion/springs";
import {
  prefersReducedMotion,
  useReducedMotionPreference,
} from "@/shared/ui/reduced-motion";

import { useBalanceHidden } from "./BalanceVisibility";
import { digitOffset, digitSidebearing, odometerCells } from "./odometer";

const MASK = "••••••";
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
/** Mask ↔ digits morph: quick enough to feel like one gesture with the eye toggle. */
const MORPH = { duration: 0.25, ease: [0.2, 0, 0, 1] } as const;

const subscribeToNothing = () => () => {};

/**
 * `true` when the component mounts on the client (e.g. navigating to Home after login),
 * `false` on the server and while hydrating server HTML.
 */
function useMountedOnClient(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

/**
 * A card balance shown as an odometer: each digit is a 0–9 strip that rolls into place
 * with a spring, cents first. Hiding it blurs the digits out (they roll back to 0, so
 * showing it again replays the roll) while the mask fades in.
 *
 * - Screen readers get only the final value, or "Saldo oculto", from a separate text;
 *   the strips are `aria-hidden`, so nobody hears "0123456789".
 * - It only rolls from 0 when it mounts on the client. Server-rendered HTML already has
 *   every strip in its final place, and replaying after hydration would flash
 *   "978.85 → 0 → 978.85". Under reduced motion every change is instant.
 * - Poppins has no tabular figures, so each column is as wide as its own final digit
 *   (an invisible copy of it sizes the column) and the number keeps the font's natural
 *   spacing: no gap around a narrow 1. The width is fixed by the final text, never by
 *   the digit passing through, so nothing shifts while it rolls; a wider digit rolling
 *   through a narrow column spills sideways instead of being cropped.
 * - The row fades at its top and bottom edges, so digits roll in instead of popping.
 */
export function BalanceAmount({ balance }: { balance: string }) {
  const hidden = useBalanceHidden();
  const reduced = useReducedMotionPreference();
  const mountedOnClient = useMountedOnClient();
  const [rollOnMount] = useState(
    () => mountedOnClient && !prefersReducedMotion(),
  );
  const cells = odometerCells(balance);

  return (
    <span
      data-testid="balance-amount"
      className="inline-flex text-[26px] leading-none font-medium tracking-[-0.02em]"
    >
      <span aria-hidden="true" className="inline-grid">
        <m.span
          data-odometer
          data-state={hidden ? "hidden" : "shown"}
          className="col-start-1 row-start-1 -mx-[0.2em] flex [mask-image:linear-gradient(transparent,black_18%,black_82%,transparent)] px-[0.2em]"
          initial={false}
          animate={{
            opacity: hidden ? 0 : 1,
            filter: hidden ? "blur(6px)" : "blur(0px)",
          }}
          transition={reduced ? INSTANT : MORPH}
        >
          {cells.map((cell) =>
            cell.kind === "digit" ? (
              <span
                key={cell.key}
                className="relative inline-block h-[1.15em] overflow-y-clip"
                style={digitSidebearing(cell.digit)}
              >
                <span data-digit-sizer className="invisible leading-[1.15]">
                  {cell.digit}
                </span>
                <m.span
                  data-digit={hidden ? 0 : cell.digit}
                  className="absolute inset-x-0 top-0 flex flex-col items-center"
                  initial={rollOnMount && !hidden ? { y: "0%" } : false}
                  animate={{ y: digitOffset(hidden ? 0 : cell.digit) }}
                  transition={
                    reduced ? INSTANT : { ...ROLL_SPRING, delay: cell.delay }
                  }
                >
                  {DIGITS.map((digit) => (
                    <span key={digit} className="h-[1.15em] leading-[1.15]">
                      {digit}
                    </span>
                  ))}
                </m.span>
              </span>
            ) : (
              <span key={cell.key} className="leading-[1.15]">
                {cell.char}
              </span>
            ),
          )}
        </m.span>
        {/* Poppins' bullets sit 0.035em lower than the digits' center: lifted to match. */}
        <m.span
          data-balance-mask
          data-state={hidden ? "shown" : "hidden"}
          className="col-start-1 row-start-1 -translate-y-[0.035em] self-center leading-[1.15]"
          initial={false}
          animate={{ opacity: hidden ? 1 : 0 }}
          transition={reduced ? INSTANT : MORPH}
        >
          {MASK}
        </m.span>
      </span>
      <span className="sr-only">
        {hidden ? "Saldo oculto" : formatAmount(balance)}
      </span>
    </span>
  );
}
