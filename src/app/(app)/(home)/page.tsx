import { prismaCardRepository } from "@/features/account/data/prisma-card-repository";
import { getAccountCards } from "@/features/account/domain/card";
import { readBalanceHidden } from "@/features/account/server/balance-visibility";
import { CardCarousel } from "@/features/account/ui/CardCarousel";
import { HomeHeader } from "@/features/account/ui/HomeHeader";
import { requireUser } from "@/features/auth/server/current-user";
import { prismaMovementRepository } from "@/features/movements/data/prisma-movement-repository";
import { getLatestMovements } from "@/features/movements/domain/movement-queries";
import { LatestMovements } from "@/features/movements/ui/LatestMovements";

export default async function HomePage() {
  const user = await requireUser();
  // Independent reads run in parallel; both are scoped to the signed-in user.
  const [cards, latestMovements, balanceHidden] = await Promise.all([
    getAccountCards(prismaCardRepository, user.id),
    getLatestMovements(prismaMovementRepository, user.id),
    readBalanceHidden(),
  ]);

  return (
    <main className="flex flex-col">
      <HomeHeader firstName={user.firstName} />
      <div className="mt-6">
        <CardCarousel cards={cards} balanceHidden={balanceHidden} />
      </div>
      <div className="mt-2">
        <LatestMovements movements={latestMovements} />
      </div>
    </main>
  );
}
