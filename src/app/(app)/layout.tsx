import type { ReactNode } from "react";

import { BottomNav } from "@/shared/ui/BottomNav";
import { BrandIntro } from "@/shared/ui/BrandIntro";
import { Escudo } from "@/shared/ui/brand/Escudo";
import { MotionProvider } from "@/shared/ui/motion/MotionProvider";

/**
 * Layout of the signed-in area (route group: it adds no URL segment). The bottom nav lives
 * here so it persists across Home, Movements and the detail, and is not re-rendered on
 * navigation; the bottom padding (nav height + breathing room + the device's bottom safe
 * area) keeps the fixed nav from covering the last rows. A focused task (the send flow)
 * has no nav, and the padding drops to zero with it. `MotionProvider` loads Motion's
 * features once for every animated island in this area. `BrandIntro` plays once when the
 * layout mounts (a cold load or signing in), never on the navigations inside it.
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <MotionProvider>
      <div className="flex flex-1 flex-col pb-(--nav-clearance)">
        {children}
      </div>
      <BottomNav />
      <BrandIntro>
        <Escudo className="brand-intro-shield" />
      </BrandIntro>
    </MotionProvider>
  );
}
