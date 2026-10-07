import { randomUUID } from "node:crypto";

import type { Metadata } from "next";

import { prismaCardRepository } from "@/features/account/data/prisma-card-repository";
import { getAccountCards } from "@/features/account/domain/card";
import { requireUser } from "@/features/auth/server/current-user";
import { prismaRecentTransfersRepository } from "@/features/transfers/data/prisma-transfer-repository";
import { getRecentRecipients } from "@/features/transfers/domain/transfer-form";
import {
  lookupRecipient,
  submitTransfer,
} from "@/features/transfers/server/actions";
import {
  QUICK_ACTION_MORPH,
  QuickActionMorph,
} from "@/features/transfers/ui/QuickActionMorph";
import { TransferFlow } from "@/features/transfers/ui/TransferFlow";
import { ROUTES } from "@/shared/lib/routes";
import { buttonClassName } from "@/shared/ui/Button";
import { CLOSE_QUICK_ACTION } from "@/shared/ui/motion/navigation";
import { ScreenTransition } from "@/shared/ui/motion/ScreenTransition";
import { MotionLink } from "@/shared/ui/motion/MotionLink";

export const metadata: Metadata = {
  title: "Transferir · GranaBank",
};

export default async function TransferPage() {
  const user = await requireUser();
  const [cards, recentRecipients] = await Promise.all([
    getAccountCards(prismaCardRepository, user.id),
    getRecentRecipients(prismaRecentTransfersRepository, user.id),
  ]);

  if (cards.length === 0) {
    return (
      <ScreenTransition>
        <main className="flex flex-col items-center px-6 py-16 text-center">
          <h1 className="text-lg font-semibold text-foreground">
            Necesitás una tarjeta para transferir
          </h1>
          <p className="mt-1 text-sm text-muted">
            El dinero sale de una de tus tarjetas, y todavía no tenés ninguna.
          </p>
          <MotionLink
            href={ROUTES.home}
            transitionTypes={CLOSE_QUICK_ACTION}
            className={buttonClassName({ size: "compact", className: "mt-8" })}
          >
            Volver al inicio
          </MotionLink>
        </main>
      </ScreenTransition>
    );
  }

  // Home's "Enviar" tile grows into this screen (see QuickActionMorph).
  return (
    <ScreenTransition>
      <QuickActionMorph name={QUICK_ACTION_MORPH.transfer}>
        <main className="flex flex-1 flex-col px-6 pt-8">
          <TransferFlow
            cards={cards}
            recentRecipients={recentRecipients}
            // Generated here, on the server: a phone on the LAN dev URL (plain http) is not a
            // secure context and has no `crypto.randomUUID`.
            idempotencyKey={randomUUID()}
            lookupAction={lookupRecipient}
            sendAction={submitTransfer}
          />
        </main>
      </QuickActionMorph>
    </ScreenTransition>
  );
}
