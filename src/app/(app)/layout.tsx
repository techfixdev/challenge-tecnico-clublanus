import type { ReactNode } from "react";

import { logout } from "@/features/auth/server/actions";
import { BottomNav } from "@/shared/ui/BottomNav";

/**
 * Layout of the signed-in area (route group: it adds no URL segment). The bottom nav lives
 * here so it persists across Home, Movements and the detail, and is not re-rendered on
 * navigation; the bottom padding (nav height + breathing room + the device's bottom safe
 * area) keeps the fixed nav from covering the last rows.
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <div className="flex flex-1 flex-col pb-[calc(7rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomNav logoutAction={logout} />
    </>
  );
}
