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
import { digitOffset, odometerCells } from "./odometer";

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
 * - Tabular figures and fixed cells: the width never changes while it rolls. Each
 *   column fades at its top and bottom edges, so neighbors roll in instead of popping.
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
      className="text-[26px] leading-none font-medium tracking-[-0.02em] tabular-nums"
    >
      <span aria-hidden="true" className="inline-grid align-middle">
        <m.span
          data-odometer
          data-state={hidden ? "hidden" : "shown"}
          className="col-start-1 row-start-1 flex"
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
                className="inline-block h-[1.15em] overflow-hidden [mask-image:linear-gradient(transparent,black_18%,black_82%,transparent)]"
              >
                <m.span
                  data-digit={hidden ? 0 : cell.digit}
                  className="flex flex-col"
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
        <m.span
          data-balance-mask
          data-state={hidden ? "shown" : "hidden"}
          className="col-start-1 row-start-1 self-center leading-[1.15]"
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
