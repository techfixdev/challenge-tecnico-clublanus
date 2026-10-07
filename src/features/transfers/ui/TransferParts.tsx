import type { ReactNode, Ref } from "react";

import { INPUT_TEXT_CLASS } from "@/shared/ui/input-text";
import { CLOSE_QUICK_ACTION } from "@/shared/ui/motion/navigation";
import { NavBar } from "@/shared/ui/NavBar";

import {
  CARD_BRAND_LABEL,
  type CardBrand,
} from "@/features/account/domain/card";

import type { ConfirmedRecipient } from "../domain/transfer-form";

/** Text inputs of the send flow (same look as the login fields). */
export const FIELD_CLASSES = `h-12 w-full rounded-xl bg-surface px-4 ${INPUT_TEXT_CLASS} text-foreground inset-shadow-recessed outline-none ring-1 ring-transparent transition placeholder:text-sm placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary/50 aria-invalid:ring-danger`;

const STEP_COUNT = 3;

/**
 * Top of the send flow, shared by its steps: the navigation bar (back chevron,
 * "Transferir", "Paso n de 3"), a segmented progress bar and the step title. It stays
 * mounted from step to step (only its texts change), so the surface below rearranges
 * under a fixed header. The title takes the focus when the step changes (tabIndex -1), so
 * a screen reader announces the new step and keyboard users continue from there.
 *
 * A fragment, not a box: the bar is then a child of the whole step, so it stays stuck at
 * the top while the step scrolls (a sticky element never leaves its parent).
 */
export function StepHeader({
  step,
  title,
  description,
  headingRef,
  back,
}: {
  step: number;
  title: string;
  description?: string;
  headingRef: Ref<HTMLHeadingElement>;
  back: { href: string } | { onBack: () => void };
}) {
  return (
    <>
      <NavBar
        title="Transferir"
        // Leaving the flow shrinks the screen back into Home's Enviar tile; NavBar's link
        // fully prefetches Home, so the tile (the view-transition pair) is there at commit.
        back={
          "href" in back
            ? { href: back.href, transitionTypes: CLOSE_QUICK_ACTION }
            : back
        }
        trailing={
          <p className="text-xs font-medium text-muted tabular-nums">
            Paso {step} de {STEP_COUNT}
          </p>
        }
      />
      <div aria-hidden="true" className="mt-4 flex gap-1.5">
        {Array.from({ length: STEP_COUNT }, (_, index) => (
          <span
            key={index}
            data-done={index < step}
            className="h-1 flex-1 rounded-full bg-border transition-colors duration-(--motion-duration-base) ease-(--motion-ease) data-[done=true]:bg-primary"
          />
        ))}
      </div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-6 text-xl font-semibold text-foreground outline-none"
      >
        {title}
      </h1>
      {description ? (
        <p className="mt-1 text-sm text-muted">{description}</p>
      ) : null}
    </>
  );
}

/** "•• •••• … •••• 0255" → "0255": the only digits a masked CVU shows. */
function lastFourDigits(cvuMasked: string): string {
  return cvuMasked.replace(/\D/g, "").slice(-4);
}

/**
 * "•••• 0255", read out as "terminado en 0255": the one way the send flow shows a masked
 * CVU (recents, amount, review), so every step looks the same.
 */
export function MaskedCvu({ cvuMasked }: { cvuMasked: string }) {
  return (
    <span className="whitespace-nowrap tabular-nums">
      <span className="sr-only">terminado en </span>
      <span aria-hidden="true">•••• </span>
      {lastFourDigits(cvuMasked)}
    </span>
  );
}

/**
 * Name, alias and "CVU •••• 0255": who the money goes to. On narrow screens the texts wrap
 * instead of being cut, so a name is never half shown.
 */
export function RecipientIdentity({
  recipient,
}: {
  recipient: Pick<ConfirmedRecipient, "fullName" | "alias" | "cvuMasked">;
}) {
  return (
    <span className="flex min-w-0 flex-1 basis-24 flex-col">
      <span className="text-[15px] font-medium text-foreground">
        {recipient.fullName}
      </span>
      {recipient.alias ? (
        <span className="text-xs text-muted">{recipient.alias}</span>
      ) : null}
      {recipient.cvuMasked ? (
        <span className="text-xs text-muted">
          CVU <MaskedCvu cvuMasked={recipient.cvuMasked} />
        </span>
      ) : null}
    </span>
  );
}

/**
 * "Visa •••• 4242", read out as "Visa terminada en 4242": the one way the send flow
 * names a card (the card picker, the review and the receipt).
 */
export function CardLabel({
  card,
}: {
  card: { brand: CardBrand; last4: string };
}) {
  return (
    <>
      {CARD_BRAND_LABEL[card.brand]} <span aria-hidden="true">•••• </span>
      <span className="sr-only">terminada en </span>
      {card.last4}
    </>
  );
}

/**
 * One term and its value in a summary list (the review and the receipt). On very narrow
 * screens the value moves under its term instead of squeezing.
 */
export function SummaryRow({
  term,
  children,
}: {
  term: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-4 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-xs text-muted">{term}</dt>
      <dd className="min-w-0 flex-1 basis-24 text-right text-sm font-medium break-words text-foreground">
        {children}
      </dd>
    </div>
  );
}

/** A form-level problem (from the server) that the user can act on. */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
    >
      {children}
    </p>
  );
}

/**
 * Help or error under a field. Always rendered and polite-live, so a new error is read
 * out while typing without stealing the focus.
 */
export function FieldMessage({
  id,
  error,
  hint,
}: {
  id: string;
  error: string | null;
  hint?: ReactNode;
}) {
  return (
    <p
      id={id}
      aria-live="polite"
      className={`min-h-4 text-xs ${error ? "text-danger" : "text-muted"}`}
    >
      {error ?? hint}
    </p>
  );
}
