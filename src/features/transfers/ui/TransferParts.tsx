import Link from "next/link";
import type { ReactNode, Ref } from "react";

import { BACK_CONTROL_CLASSES } from "@/shared/ui/back-control";
import { ChevronLeftIcon } from "@/shared/ui/icons";
import { INPUT_TEXT_CLASS } from "@/shared/ui/input-text";

import type { ConfirmedRecipient } from "../domain/transfer-form";

/** Text inputs of the send flow (same look as the login fields). */
export const FIELD_CLASSES = `h-12 w-full rounded-xl bg-surface px-4 ${INPUT_TEXT_CLASS} text-foreground inset-shadow-recessed outline-none ring-1 ring-transparent transition placeholder:text-sm placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary/50 aria-invalid:ring-danger`;

export const STEP_COUNT = 3;

/**
 * Top of every step: back control, "Paso n de 3" with a segmented progress bar, and the
 * step title. The title takes the focus when the step changes (tabIndex -1), so a screen
 * reader announces the new step and keyboard users continue from there.
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
  description: string;
  headingRef: Ref<HTMLHeadingElement>;
  back: { href: string } | { onBack: () => void };
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        {"href" in back ? (
          <Link href={back.href} className={BACK_CONTROL_CLASSES}>
            <ChevronLeftIcon className="size-5" />
            Volver
          </Link>
        ) : (
          <button
            type="button"
            onClick={back.onBack}
            className={BACK_CONTROL_CLASSES}
          >
            <ChevronLeftIcon className="size-5" />
            Volver
          </button>
        )}
        <p className="text-xs font-medium text-muted tabular-nums">
          Paso {step} de {STEP_COUNT}
        </p>
      </div>
      <div aria-hidden="true" className="mt-6 flex gap-1.5">
        {Array.from({ length: STEP_COUNT }, (_, index) => (
          <span
            key={index}
            data-done={index < step}
            className="h-1 flex-1 rounded-full bg-border transition-colors duration-300 data-[done=true]:bg-primary"
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
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}

function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

/** Initials tile, the same size and radius as a movement's type tile. */
export function RecipientAvatar({ fullName }: { fullName: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft/60 lit-soft text-sm font-semibold text-primary inset-shadow-specular-soft"
    >
      {initialsOf(fullName)}
    </span>
  );
}

/** "•••• •••• … ••02 55" → "0255": the only digits a masked CVU shows. */
export function lastFourDigits(cvuMasked: string): string {
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
