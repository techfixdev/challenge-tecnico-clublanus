import type { ReactNode } from "react";

import { INPUT_TEXT_CLASS } from "@/shared/ui/input-text";

/**
 * Fields on the granate login backdrop: a recessed, faintly lit well (white at 8%) with a
 * hairline that keeps 3:1 against the backdrop, white text, a placeholder at 4.5:1 or more
 * wherever the field sits (white at 70%), a gold focus ring and a light-red invalid ring:
 * `danger-on-brand`, the one error color of this screen (field messages and the form
 * banner use it too).
 * The contrast figures are in README → Brand.
 */
export const INPUT_CLASSES = `h-12 w-full rounded-xl bg-white/8 px-4 ${INPUT_TEXT_CLASS} text-white caret-gold-light inset-shadow-recessed-on-brand outline-none ring-1 ring-white/50 transition placeholder:text-sm placeholder:text-white/70 hover:ring-white/65 focus-visible:ring-2 focus-visible:ring-gold-light aria-invalid:ring-2 aria-invalid:ring-danger-on-brand`;

/** ids used to wire the label and error message to the control (aria-describedby). */
export function fieldIds(name: string) {
  return { inputId: name, errorId: `${name}-error` };
}

type FormFieldProps = {
  name: string;
  label: string;
  error?: string;
  children: ReactNode;
};

/** Label + control + error message. The control itself sets aria-invalid/aria-describedby. */
export function FormField({ name, label, error, children }: FormFieldProps) {
  const { inputId, errorId } = fieldIds(name);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-white">
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={errorId}
          className="flex items-start gap-1.5 text-xs text-danger-on-brand"
        >
          <ErrorGlyph className="mt-px size-3.5" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The login's error mark: a circled "!" in the current color. Decorative (the message
 * says what is wrong), so it is hidden from assistive tech.
 */
export function ErrorGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className={`shrink-0 ${className}`}
    >
      <circle cx="10" cy="10" r="8" />
      <path d="M10 6v4.5" />
      <path d="M10 13.6v.1" />
    </svg>
  );
}
