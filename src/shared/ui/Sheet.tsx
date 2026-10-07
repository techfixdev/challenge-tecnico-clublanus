"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { CloseIcon } from "./icons";

/**
 * A bottom sheet: a modal `<dialog>` that rises from the bottom edge of the phone column
 * over a dimmed page, and sinks back when closed (`.sheet` in globals.css; instant under
 * reduced motion). Being a native modal dialog, it traps the focus, closes on Escape and
 * returns the focus to what opened it. A tap on the dimmed page and the close button
 * close it too. `onClose` runs on every way out, so the owner's `open` state stays in
 * sync with the dialog.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog. */
  label: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      // Every current browser has showModal; the attribute keeps older ones usable.
      if (typeof element.showModal === "function") element.showModal();
      else element.setAttribute("open", "");
    } else if (!open && element.open) {
      if (typeof element.close === "function") element.close();
      else element.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-label={label}
      onClose={onClose}
      // The dialog box itself is padding-free, so a click whose target is the dialog
      // landed on its backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="sheet fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[85dvh] w-full max-w-[420px] overflow-y-auto rounded-t-[28px] bg-surface p-0 text-foreground shadow-float"
    >
      <div className="relative flex flex-col px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <span
          aria-hidden="true"
          className="mx-auto h-1 w-9 rounded-full bg-border"
        />
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="absolute top-3 right-4 flex size-10 pressable items-center justify-center rounded-full text-muted hover:bg-background hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
        >
          <CloseIcon className="size-5" />
        </button>
        {children}
      </div>
    </dialog>
  );
}
