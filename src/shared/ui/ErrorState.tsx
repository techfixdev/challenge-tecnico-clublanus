import { Button } from "./Button";

type ErrorStateProps = {
  title: string;
  description?: string;
  onRetry: () => void;
};

/** Friendly recoverable error used by the route error boundaries (`error.tsx`). */
export function ErrorState({
  title,
  description = "Puede ser un problema momentáneo. Probá de nuevo en unos segundos.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center px-6 py-16 text-center"
    >
      <span
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-3xl bg-danger-soft lit-soft text-2xl font-semibold text-danger inset-shadow-specular-soft"
      >
        !
      </span>
      <h2 className="mt-5 text-base font-semibold text-balance text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <Button className="mt-8 max-w-56" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
