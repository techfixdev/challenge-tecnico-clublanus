"use client";

import type { ReactNode } from "react";

import { useKeyboardInset } from "@/shared/ui/keyboard-inset";

/**
 * Disabled look of the send flow's primary action: a flat gray slab with muted text, so
 * "not yet" reads at a glance instead of a slightly faded granate button that still
 * looks pressable. (`bg-none` drops the lit sheen; the shadows go too.)
 */
export const PRIMARY_DISABLED_CLASSES =
  "disabled:bg-border disabled:bg-none disabled:text-muted disabled:opacity-100 disabled:shadow-none disabled:inset-shadow-none";

/**
 * The bottom of a step: its primary action (and what goes with it), pinned to the bottom
 * of the screen, so it is always on screen and in the thumb zone without scrolling,
 * whatever the step's length. It is the last thing in the step (`mt-auto` pushes it
 * down on a short step; `sticky` keeps it on screen on a tall one) and covers the content
 * scrolling under it edge to edge with the page color. It pads itself by the device's
 * bottom safe area, and rides above the on-screen keyboard while a field is focused.
 *
 * With `action`, the bar is the step's form itself (the review step posts it).
 */
export function StepActions({
  action,
  children,
}: {
  action?: (formData: FormData) => void;
  children: ReactNode;
}) {
  const keyboard = useKeyboardInset();
  const props = {
    "data-step-actions": "",
    style: { bottom: keyboard },
    className:
      "sticky z-10 -mx-6 mt-auto flex flex-col gap-3 bg-background px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
  };
  return action ? (
    <form action={action} {...props}>
      {children}
    </form>
  ) : (
    <div {...props}>{children}</div>
  );
}
