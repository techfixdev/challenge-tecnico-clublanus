import "server-only";

import { prismaMovementRepository } from "../data/prisma-movement-repository";
import { getMonthlySummary } from "../domain/movement-summary";
import { MonthlySummaryView } from "./MonthlySummaryView";

/**
 * Container (Server Component): this month's totals for the signed-in user. Not tied to
 * the search or type filter: it summarizes the month, whatever the list shows.
 */
export async function MonthlySummary({ userId }: { userId: string }) {
  const summary = await getMonthlySummary(prismaMovementRepository, userId);
  return <MonthlySummaryView summary={summary} />;
}
