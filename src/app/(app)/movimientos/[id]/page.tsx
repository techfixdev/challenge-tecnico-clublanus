import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireUser } from "@/features/auth/server/current-user";
import { prismaMovementRepository } from "@/features/movements/data/prisma-movement-repository";
import { detailBackHref } from "@/features/movements/domain/movement-filters";
import { getMovement } from "@/features/movements/domain/movement-queries";
import { MovementDetail } from "@/features/movements/ui/MovementDetail";

export const metadata: Metadata = {
  title: "Detalle del movimiento · GranaBank",
};

export default async function MovementDetailPage({
  params,
  searchParams,
}: PageProps<"/movimientos/[id]">) {
  const user = await requireUser();
  const { id } = await params;

  // Scoped by owner: a malformed id, an unknown id and another user's id all 404 alike.
  // No `loading.tsx` wraps this segment (it is a single indexed lookup), so nothing has
  // streamed yet when `notFound()` runs and the response carries a real 404 status.
  const movement = await getMovement(prismaMovementRepository, user.id, id);
  if (!movement) notFound();

  return (
    <MovementDetail
      movement={movement}
      backHref={detailBackHref(await searchParams)}
    />
  );
}
