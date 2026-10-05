import type { ReactNode } from "react";

export const INPUT_CLASSES =
  "h-12 w-full rounded-xl bg-surface px-4 text-sm text-foreground shadow-card outline-none ring-1 ring-transparent transition placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary/50 aria-invalid:ring-danger";

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
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
