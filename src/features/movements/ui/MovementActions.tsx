"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { copyText } from "@/shared/ui/clipboard";
import { CopyIcon, SendIcon, ShareIcon } from "@/shared/ui/icons";
import { PUSH } from "@/shared/ui/motion/navigation";
import { MotionLink } from "@/shared/ui/motion/MotionLink";

const FEEDBACK_MS = 2000;
const COPY_FAILED =
  "No pudimos copiar. Mantené presionado el texto para copiarlo.";
const SHARE_TITLE = "Comprobante de GranaBank";

const ROW_CLASSES =
  "flex min-h-14 w-full pressable items-center gap-4 px-5 py-3 text-left text-[15px] font-medium text-foreground focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-inset";

function RowContent({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <span aria-hidden="true" className="text-primary">
        {icon}
      </span>
      {children}
    </>
  );
}

/**
 * What can be done with a movement, under its receipt: a grouped list (same language as
 * the movement list) instead of a row of buttons competing with the amount.
 *
 * - "Compartir comprobante": the native share sheet with the receipt as text, or, where
 *   there is none (desktop, the LAN dev URL over http), the same text copied, confirmed by a
 *   quiet "Copiado".
 * - "Copiar referencia": what support asks for.
 * - "Repetir transferencia": only when the page passes where to go (a transfer the user
 *   sent to a known alias); the send page resolves that alias again on the server.
 *
 * Feedback is one polite live region, so a screen reader hears it without losing focus.
 */
export function MovementActions({
  shareText,
  reference,
  repeatHref,
}: {
  shareText: string;
  reference: string;
  repeatHref: string | null;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function show(message: string) {
    clearTimeout(timer.current);
    setFeedback(message);
    timer.current = setTimeout(() => setFeedback(null), FEEDBACK_MS);
  }

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: SHARE_TITLE, text: shareText });
        return;
      } catch (error) {
        // Closing the share sheet is a choice, not a failure.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }
    show((await copyText(shareText)) ? "Copiado" : COPY_FAILED);
  }

  async function copyReference() {
    show((await copyText(reference)) ? "Referencia copiada" : COPY_FAILED);
  }

  return (
    <section aria-label="Acciones" className="mt-6 flex flex-col">
      <ul className="divide-y divide-border overflow-hidden rounded-3xl bg-surface lit-surface shadow-card">
        <li>
          <button type="button" onClick={share} className={ROW_CLASSES}>
            <RowContent icon={<ShareIcon className="size-5" />}>
              Compartir comprobante
            </RowContent>
          </button>
        </li>
        <li>
          <button type="button" onClick={copyReference} className={ROW_CLASSES}>
            <RowContent icon={<CopyIcon className="size-5" />}>
              Copiar referencia
            </RowContent>
          </button>
        </li>
        {repeatHref ? (
          <li>
            <MotionLink
              href={repeatHref}
              transitionTypes={PUSH}
              className={ROW_CLASSES}
            >
              <RowContent icon={<SendIcon className="size-5" />}>
                Repetir transferencia
              </RowContent>
            </MotionLink>
          </li>
        ) : null}
      </ul>
      <p role="status" className="mt-3 min-h-4 text-center text-xs text-muted">
        {feedback}
      </p>
    </section>
  );
}
