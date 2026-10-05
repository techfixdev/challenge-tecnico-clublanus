"use client";

import { useEffect, useRef, useState } from "react";

import { BellIcon } from "@/shared/ui/icons";

export const FEEDBACK_MS = 2000;

/**
 * Notifications are out of scope. Instead of a dead or disabled icon, the bell stays a
 * focusable button and briefly says "Próximamente"; the text lives in a polite live region,
 * so screen readers announce it too.
 */
export function NotificationsButton() {
  const [showFeedback, setShowFeedback] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  function handleClick() {
    setShowFeedback(true);
    // Every click restarts the countdown, so the message never vanishes right after a tap.
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowFeedback(false), FEEDBACK_MS);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notificaciones"
        onClick={handleClick}
        className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
      >
        <BellIcon className="size-[22px]" />
      </button>
      <p
        role="status"
        className={`absolute top-full right-0 z-10 mt-1 rounded-xl bg-foreground px-3 py-1.5 text-xs whitespace-nowrap text-white shadow-card transition-opacity empty:hidden ${showFeedback ? "opacity-100" : "opacity-0"}`}
      >
        {showFeedback ? "Próximamente" : ""}
      </p>
    </div>
  );
}
