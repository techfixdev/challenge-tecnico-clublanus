import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "block" | "compact";

const BASE_CLASSES =
  "inline-flex items-center justify-center rounded-2xl text-sm font-semibold pressable focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white shadow-card hover:bg-primary/90",
  secondary:
    "bg-surface text-primary border border-border shadow-card hover:bg-primary-soft/40",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  /** Full-width form/page action ("Ingresar", "Cargar más"). */
  block: "h-14 w-full",
  /** Content-width call to action inside an empty or error state. */
  compact: "h-12 px-6",
};

/**
 * Button look as a class string, so a `<Link>` that acts as a call to action (navigation,
 * not an action) looks exactly like a `<Button>` without duplicating its classes.
 */
export function buttonClassName({
  variant = "primary",
  size = "block",
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return `${BASE_CLASSES} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
}
