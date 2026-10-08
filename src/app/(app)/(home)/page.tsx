import { prismaCardRepository } from "@/features/account/data/prisma-card-repository";
import { getAccountCards, toCardFace } from "@/features/account/domain/card";
import { CardCarousel } from "@/features/account/ui/CardCarousel";
import { HomeEntrance } from "@/features/account/ui/HomeEntrance";
import { HomeHeader } from "@/features/account/ui/HomeHeader";
import { requireUser } from "@/features/auth/server/current-user";
import { prismaMovementRepository } from "@/features/movements/data/prisma-movement-repository";
import { getLatestMovements } from "@/features/movements/domain/movement-queries";
import { LatestMovements } from "@/features/movements/ui/LatestMovements";
import { TransferShortcuts } from "@/features/transfers/ui/TransferShortcuts";
import { ScreenTransition } from "@/shared/ui/motion/ScreenTransition";

export default async function HomePage() {
  const user = await requireUser();
  // Independent reads run in parallel; both are scoped to the signed-in user.
  const [cards, latestMovements] = await Promise.all([
    getAccountCards(prismaCardRepository, user.id),
    getLatestMovements(prismaMovementRepository, user.id),
  ]);

  return (
    <ScreenTransition>
      <main className="flex flex-col">
        <HomeHeader firstName={user.firstName} />
        {/* The `home-enter-*` classes build Home once when the app opens (HomeEntrance). */}
        <HomeEntrance />
        {/* 24px from the title, as in the design: the header's own 12px bottom padding
          (its compact bar needs it) plus 12px here. */}
        <div className="home-enter-card mt-3">
          {/* Faces only: balances, numbers and CVVs never reach the page until revealed. */}
          <CardCarousel cards={cards.map(toCardFace)} />
        </div>
        <div className="home-enter-actions mt-5">
          <TransferShortcuts />
        </div>
        <div className="home-enter-rows mt-6">
          <LatestMovements movements={latestMovements} />
        </div>
      </main>
    </ScreenTransition>
  );
}
