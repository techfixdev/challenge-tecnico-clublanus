import type { ReactNode } from "react";

/**
 * Mobile-first frame: full width on phones; on larger screens the app is rendered as a
 * centered phone-width column, since the design only defines a mobile layout.
 * The viewport uses `viewport-fit=cover`, so the column pads itself by the safe-area
 * insets (notch, rounded corners, landscape sensor housing); the bottom inset is handled
 * by the fixed nav and the bottom-pinned login button.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full justify-center bg-background">
      <div className="relative flex min-h-dvh w-full max-w-[420px] flex-col bg-background pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] sm:border-x sm:border-border">
        {children}
      </div>
    </div>
  );
}
