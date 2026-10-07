"use client";

import { useRef, useState } from "react";

import { Button } from "@/shared/ui/Button";
import { LogoutIcon } from "@/shared/ui/icons";
import { Sheet } from "@/shared/ui/Sheet";

const SHEET_LABEL = "Tu perfil";

function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
}

/**
 * The profile entry point on Home: the user's initials in the header open a sheet with
 * who is signed in and the way out. Signing out is destructive (the next visit needs the
 * password again), so it takes a second, explicit tap; the confirmation puts the focus
 * on "Cancelar", the safe choice. The logout Server Action is injected (Home wires the
 * real one, tests pass a fake).
 */
export function ProfileMenu({
  firstName,
  lastName,
  email,
  logoutAction,
}: {
  firstName: string;
  lastName: string;
  email: string;
  logoutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Back from the confirmation: the focus returns to "Cerrar sesión" (autoFocus), not to
  // the top of the sheet. On a fresh open the dialog places it as usual.
  const [returnedFromConfirmation, setReturnedFromConfirmation] =
    useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  function openSheet() {
    setConfirming(false);
    setReturnedFromConfirmation(false);
    setOpen(true);
  }

  function cancelLogout() {
    setReturnedFromConfirmation(true);
    setConfirming(false);
  }

  function close() {
    if (!open) return;
    setOpen(false);
    trigger.current?.focus();
  }

  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={SHEET_LABEL}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openSheet}
        className="flex size-10 pressable items-center justify-center rounded-full bg-primary-soft/60 text-xs font-semibold text-primary focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
      >
        <span aria-hidden="true">{initialsOf(firstName, lastName)}</span>
      </button>

      <Sheet open={open} onClose={close} label={SHEET_LABEL}>
        <div className="mt-6 flex items-center gap-4 pr-10">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft/60 text-base font-semibold text-primary"
          >
            {initialsOf(firstName, lastName)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-base font-semibold break-words text-foreground">
              {fullName}
            </span>
            <span className="text-sm break-all text-muted">{email}</span>
          </span>
        </div>

        {confirming ? (
          <div className="mt-8 flex flex-col">
            <p className="text-base font-semibold text-foreground">
              ¿Cerrar sesión?
            </p>
            <p className="mt-1 text-sm text-muted">
              Para volver a entrar vas a necesitar tu email y tu contraseña.
            </p>
            <form action={logoutAction} className="mt-6 flex flex-col">
              <Button type="submit">Sí, cerrar sesión</Button>
            </form>
            <Button
              variant="secondary"
              className="mt-3"
              autoFocus
              onClick={cancelLogout}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            className="mt-8 gap-2"
            autoFocus={returnedFromConfirmation}
            onClick={() => setConfirming(true)}
          >
            <LogoutIcon aria-hidden="true" className="size-5" />
            Cerrar sesión
          </Button>
        )}
      </Sheet>
    </>
  );
}
