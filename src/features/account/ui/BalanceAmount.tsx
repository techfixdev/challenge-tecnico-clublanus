"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";

import { formatMoneyForSpeech } from "@/shared/lib/format";
import { FADE, INSTANT, ROLL_SPRING } from "@/shared/ui/motion/springs";
import { useReducedMotionPreference } from "@/shared/ui/reduced-motion";

import { digitOffset, digitSidebearing, odometerCells } from "./odometer";

const MASK = "••••••";
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * A card balance shown as an odometer: each digit is a 0–9 strip that rolls into place
 * with a spring, cents first. `balance` is null while the card is masked: then only the
 * mask is rendered, so neither the markup nor the width of the row can spell the amount
 * (the page does not even have it; it arrives with the reveal). Revealing fades the
 * digits in (rising 4px) and rolls them up from 0; hiding fades them out while the mask
 * fades in. Opacity and a short translate only: a blur would repaint the card each frame.
 *
 * - Screen readers get only the final value with its currency in words ("978,85
 *   dólares"), or "Saldo oculto", from a separate text; the strips are `aria-hidden`,
 *   so nobody hears "0123456789". Under reduced motion every change is instant.
 * - Poppins has no tabular figures, so each column is as wide as its own final digit
 *   (an invisible copy of it sizes the column) and the number keeps the font's natural
 *   spacing: no gap around a narrow 1. The width is fixed by the final text, never by
 *   the digit passing through, so nothing shifts while it rolls; a wider digit rolling
 *   through a narrow column spills sideways instead of being cropped.
 * - The row fades at its top and bottom edges, so digits roll in instead of popping.
 */
export function BalanceAmount({
  balance,
  currency,
}: {
  balance: string | null;
  currency: string;
}) {
  const hidden = balance === null;
  const reduced = useReducedMotionPreference();
  // Mask ↔ digits: one fast fade, so it feels like part of the eye toggle's gesture.
  const morph = reduced ? INSTANT : FADE;

  return (
    <span
      data-testid="balance-amount"
      className="inline-flex text-[length:calc(var(--card-px,1px)*26)] leading-none font-medium tracking-[-0.02em]"
    >
      <span aria-hidden="true" className="inline-grid">
        <AnimatePresence initial={false}>
          {balance !== null && (
            <m.span
              key="odometer"
              data-odometer
              data-state="shown"
              className="col-start-1 row-start-1 -mx-[0.2em] flex [mask-image:linear-gradient(transparent,black_18%,black_82%,transparent)] px-[0.2em]"
              initial={reduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={morph}
            >
              {odometerCells(balance).map((cell) =>
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
                      data-digit={cell.digit}
                      className="absolute inset-x-0 top-0 flex flex-col items-center"
                      // Revealed on the client: roll up from 0, cents first.
                      initial={reduced ? false : { y: "0%" }}
                      animate={{ y: digitOffset(cell.digit) }}
                      transition={
                        reduced
                          ? INSTANT
                          : { ...ROLL_SPRING, delay: cell.delay }
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
          )}
        </AnimatePresence>
        {/* Poppins' bullets sit 0.035em lower than the digits' center: lifted to match. */}
        <m.span
          data-balance-mask
          data-state={hidden ? "shown" : "hidden"}
          className="col-start-1 row-start-1 -translate-y-[0.035em] self-center leading-[1.15]"
          initial={false}
          animate={{ opacity: hidden ? 1 : 0 }}
          transition={morph}
        >
          {MASK}
        </m.span>
      </span>
      <span className="sr-only">
        {balance === null
          ? "Saldo oculto"
          : formatMoneyForSpeech(balance, currency)}
      </span>
    </span>
  );
}
