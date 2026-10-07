import type { Metadata } from "next";

import { prismaReceiveDetailsRepository } from "@/features/account/data/prisma-receive-details-repository";
import { getReceiveDetails } from "@/features/account/domain/account-identifiers";
import { receiveQrPayload } from "@/features/account/domain/receive-qr";
import { ReceiveDetailsCard } from "@/features/account/ui/ReceiveDetailsCard";
import { requireUser } from "@/features/auth/server/current-user";
import {
  QUICK_ACTION_MORPH,
  QuickActionMorph,
} from "@/features/transfers/ui/QuickActionMorph";
import { CLOSE_QUICK_ACTION } from "@/shared/ui/motion/navigation";
import { ScreenTransition } from "@/shared/ui/motion/ScreenTransition";
import { NavBar } from "@/shared/ui/NavBar";
import { ROUTES } from "@/shared/lib/routes";
import { ReceiveIcon } from "@/shared/ui/icons";
import { QrCode } from "@/shared/ui/qr/QrCode";

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
          <NavBar
            title="Recibir"
            back={{ href: ROUTES.home, transitionTypes: CLOSE_QUICK_ACTION }}
          />
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

          {details ? (
            <section
              aria-labelledby="receive-qr"
              className="mt-6 flex flex-col items-center rounded-3xl bg-surface lit-surface p-5 text-center shadow-card"
            >
              <h2
                id="receive-qr"
                className="text-sm font-medium text-foreground"
              >
                Tu código QR
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Quien lo escanee ve tu alias y tu CVU para transferirte.
              </p>
              {/* Plain text, not an interbank payment QR: see receiveQrPayload. */}
              <QrCode
                value={receiveQrPayload(details)}
                label={`Código QR con tu alias ${details.alias} y tu CVU`}
                className="mt-4 max-w-52 rounded-2xl ring-1 ring-border"
              />
            </section>
          ) : null}

          <section
            aria-labelledby="how-it-arrives"
            className="mt-6 flex gap-3 px-1"
          >
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft/40 lit-soft text-primary"
            >
              <ReceiveIcon className="size-4" />
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
