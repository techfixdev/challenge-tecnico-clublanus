import type { Metadata } from "next";

import { prismaReceiveDetailsRepository } from "@/features/account/data/prisma-receive-details-repository";
import { getReceiveDetails } from "@/features/account/domain/account-identifiers";
import { ReceiveDetailsCard } from "@/features/account/ui/ReceiveDetailsCard";
import { requireUser } from "@/features/auth/server/current-user";
import {
  QUICK_ACTION_MORPH,
  QuickActionMorph,
} from "@/features/transfers/ui/QuickActionMorph";
import { BackLink } from "@/shared/ui/BackLink";
import { CLOSE_QUICK_ACTION } from "@/shared/ui/motion/navigation";
import { ScreenTransition } from "@/shared/ui/motion/ScreenTransition";
import { ROUTES } from "@/shared/lib/routes";
import { ReceiveIcon } from "@/shared/ui/icons";

export const metadata: Metadata = {
  title: "Recibir · GranaBank",
};

export default async function ReceivePage() {
  const user = await requireUser();
  const details = await getReceiveDetails(
    prismaReceiveDetailsRepository,
    user.id,
  );

  // Home's "Recibir" tile grows into this screen (see QuickActionMorph); "Volver"
  // shrinks it back into the tile (`quick-action-close`), instead of a pop.
  return (
    <ScreenTransition>
      <QuickActionMorph name={QUICK_ACTION_MORPH.receive}>
        <main className="flex flex-col px-6 pt-8">
          <BackLink href={ROUTES.home} transitionTypes={CLOSE_QUICK_ACTION} />
          <h1 className="mt-6 text-xl font-semibold text-foreground">
            Recibir dinero
          </h1>
          <p className="mt-1 text-sm text-muted">
            Compartí tu alias o tu CVU con quien te quiera transferir.
          </p>

          <div className="mt-8">
            {details ? (
              <ReceiveDetailsCard details={details} />
            ) : (
              <p className="rounded-3xl bg-surface lit-surface p-6 text-center text-sm text-muted shadow-card">
                Tu cuenta todavía no tiene alias ni CVU asignados.
              </p>
            )}
          </div>

          <section
            aria-labelledby="how-it-arrives"
            className="mt-6 flex gap-4 rounded-2xl bg-primary-soft/25 p-4"
          >
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface lit-surface text-primary shadow-1"
            >
              <ReceiveIcon className="size-5" />
            </span>
            <div>
              <h2
                id="how-it-arrives"
                className="text-sm font-medium text-foreground"
              >
                ¿Cómo te llega el dinero?
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Cuando otra persona de GranaBank te transfiere a este alias o
                CVU, el dinero se acredita al instante en tu tarjeta principal y
                lo ves en tus movimientos.
              </p>
            </div>
          </section>
        </main>
      </QuickActionMorph>
    </ScreenTransition>
  );
}
