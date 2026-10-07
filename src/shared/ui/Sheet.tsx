"use client";

import {
  animate,
  useMotionValue,
  type AnimationPlaybackControls,
} from "motion/react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";

import {
  dragProgress,
  rubberBand,
  shouldDismissSheet,
} from "./gestures/drag-physics";
import { useAxisDrag } from "./gestures/use-axis-drag";
import { CloseIcon } from "./icons";
import { INSTANT, SPRING } from "./motion/springs";
import { useBoundStyle } from "./motion/use-bound-style";
import { useReducedMotionPreference } from "./reduced-motion";

/** The grab handle's strip, where a drag can always start. */
const GRAB_SELECTOR = "[data-sheet-grab]";

/**
 * Keeps `data-overflowing` on the sheet while its content is taller than it (it then
 * scrolls), which decides where a drag may start and the sheet's `touch-action`.
 */
function watchOverflow(element: HTMLDialogElement) {
  const update = () =>
    element.toggleAttribute(
      "data-overflowing",
      element.scrollHeight > element.clientHeight,
    );
  update();
  if (typeof ResizeObserver === "undefined") return () => {};
  const observer = new ResizeObserver(update);
  observer.observe(element);
  if (element.firstElementChild) observer.observe(element.firstElementChild);
  return () => observer.disconnect();
}

/**
 * Drag to dismiss: the sheet follows a finger dragging it down 1:1 (and resists one
 * pulling it up, like a rubber band), and the page behind lightens as it goes
 * (`--sheet-drag-progress`, read by the backdrop in globals.css). Released far enough
 * down, or flicked down, it closes the way the close button does (it keeps sinking from
 * where the finger left it); otherwise it settles back on the spring, with the finger's
 * velocity.
 *
 * A drag starts on the grab handle, or anywhere on the sheet while its content fits (a
 * sheet whose content scrolls keeps vertical drags for the scroll).
 */
function useDragToDismiss(
  dialog: RefObject<HTMLDialogElement | null>,
  onDismiss: () => void,
) {
  const reduced = useReducedMotionPreference();
  const offset = useMotionValue(0);
  const height = useRef(0);
  const settling = useRef<AnimationPlaybackControls | null>(null);

  useBoundStyle(dialog, offset, (style, y) => {
    style.transform = y === 0 ? "" : `translate3d(0, ${y}px, 0)`;
    style.setProperty(
      "--sheet-drag-progress",
      String(dragProgress(y, height.current)),
    );
  });

  useAxisDrag(dialog, {
    axis: "y",
    canStart: (event) => {
      const element = dialog.current;
      if (!element?.open) return false;
      const onGrab =
        event.target instanceof Element &&
        event.target.closest(GRAB_SELECTOR) !== null;
      return onGrab || !element.hasAttribute("data-overflowing");
    },
    onStart: () => {
      settling.current?.stop();
      height.current = dialog.current?.offsetHeight ?? 0;
    },
    onMove: (dy) => offset.set(dy >= 0 ? dy : -rubberBand(-dy, height.current)),
    onRelease: (dy, velocity) => {
      if (shouldDismissSheet(dy, velocity, height.current)) {
        onDismiss();
        return;
      }
      settling.current = animate(
        offset,
        0,
        reduced ? INSTANT : { ...SPRING, velocity },
      );
    },
    onCancel: () => {
      settling.current = animate(offset, 0, reduced ? INSTANT : SPRING);
    },
  });

  /** Back at rest, for the next time the sheet opens. */
  return function reset() {
    settling.current?.stop();
    offset.jump(0);
  };
}

/**
 * A bottom sheet: a modal `<dialog>` that rises from the bottom edge of the phone column
 * over a dimmed page, and sinks back when closed (`.sheet` in globals.css; instant under
 * reduced motion). Being a native modal dialog, it traps the focus, closes on Escape and
 * returns the focus to what opened it. A tap on the dimmed page, the close button and
 * dragging it down (see `useDragToDismiss`) close it too. `onClose` runs on every way
 * out, so the owner's `open` state stays in sync with the dialog.
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
  const resetDrag = useDragToDismiss(dialog, onClose);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      // A sheet dismissed by a drag closed from where the finger left it: it opens again
      // from the bottom edge, at rest.
      resetDrag();
      // Every current browser has showModal; the attribute keeps older ones usable.
      if (typeof element.showModal === "function") element.showModal();
      else element.setAttribute("open", "");
    } else if (!open && element.open) {
      if (typeof element.close === "function") element.close();
      else element.removeAttribute("open");
    }
    // `resetDrag` only touches the drag's motion value, which is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    return watchOverflow(element);
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
        {/* The handle's strip is a 44px-tall grip across the sheet's top edge. */}
        <div
          data-sheet-grab=""
          aria-hidden="true"
          className="sheet-grab relative -mx-6 flex justify-center before:absolute before:inset-x-0 before:-top-3 before:h-11"
        >
          <span className="h-1 w-9 rounded-full bg-border" />
        </div>
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
