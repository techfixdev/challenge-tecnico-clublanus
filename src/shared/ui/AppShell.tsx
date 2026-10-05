import type { ReactNode } from "react";

/**
 * Mobile-first frame: full width on phones; on larger screens the app is rendered as a
 * centered phone-width column, since the design only defines a mobile layout.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full justify-center bg-background">
      <div className="relative flex min-h-dvh w-full max-w-[420px] flex-col bg-background sm:border-x sm:border-border">
        {children}
      </div>
    </div>
  );
}
