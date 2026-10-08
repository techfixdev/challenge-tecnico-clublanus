"use client";

import { useEffect, useRef, type ReactNode } from "react";

import type { KeypadKey } from "../domain/amount-keypad";

/** Holding delete this long clears the whole amount, as on a phone's dialer. */
const LONG_PRESS_MS = 500;

const HINT_ID = "keypad-delete-hint";

const KEYS: { key: KeypadKey; label: ReactNode; name: string }[] = [
  ...(["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const).map((digit) => ({
    key: digit,
    label: digit,
    name: digit,
  })),
  { key: "decimal", label: ",", name: "Coma decimal" },
  { key: "0", label: "0", name: "0" },
  { key: "delete", label: <DeleteIcon />, name: "Borrar" },
];

/**
 * The amount's own keypad (3×4: digits, the decimal comma, delete), so the amount never
 * needs the phone's keyboard. Keys are 48px tall and fill briefly on press (the
 * `keypad-key` utility); holding delete clears the amount. A key never takes the focus
 * from the amount field (no blur, so a half-typed "12," is not rewritten mid-entry); it
 * stays reachable with Tab like any button.
 */
export function AmountKeypad({ onKey }: { onKey: (key: KeypadKey) => void }) {
  return (
    <div
      role="group"
      aria-label="Teclado numérico"
      className="grid grid-cols-3 gap-1"
    >
      {KEYS.map((entry) =>
        entry.key === "delete" ? (
          <DeleteKey key="delete" name={entry.name} onKey={onKey}>
            {entry.label}
          </DeleteKey>
        ) : (
          <button
            key={entry.key}
            type="button"
            aria-label={entry.name}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onKey(entry.key)}
            className="keypad-key text-foreground"
          >
            {entry.label}
          </button>
        ),
      )}
    </div>
  );
}

/** Delete: a tap removes the last character, a long press clears everything. */
function DeleteKey({
  name,
  onKey,
  children,
}: {
  name: string;
  onKey: (key: KeypadKey) => void;
  children: ReactNode;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set when the long press already cleared: the click that ends it must not delete too.
  // A press that ends off the key brings no click, so every new press (finger or key)
  // starts with it unset.
  const cleared = useRef(false);

  function cancel() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }

  // The keypad can fold away under a held finger (the step changed): the pending clear
  // must not reach an amount that is no longer on screen.
  useEffect(() => cancel, []);

  return (
    <button
      type="button"
      aria-label={name}
      aria-describedby={HINT_ID}
      onMouseDown={(event) => event.preventDefault()}
      onPointerDown={() => {
        cleared.current = false;
        cancel();
        timer.current = setTimeout(() => {
          cleared.current = true;
          onKey("clear");
        }, LONG_PRESS_MS);
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={() => (cleared.current = false)}
      onContextMenu={(event) => event.preventDefault()}
      onClick={() => {
        if (cleared.current) {
          cleared.current = false;
          return;
        }
        onKey("delete");
      }}
      className="keypad-key text-muted"
    >
      {children}
      <span id={HINT_ID} className="sr-only">
        Mantené presionado para borrar todo
      </span>
    </button>
  );
}

function DeleteIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7 6-7Z" />
      <path d="m12 9.5 5 5m0-5-5 5" />
    </svg>
  );
}
