import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import Link from "next/link";

import { prismaCardRepository } from "@/features/account/data/prisma-card-repository";
import { getAccountCards } from "@/features/account/domain/card";
import { requireUser } from "@/features/auth/server/current-user";
import { prismaRecentTransfersRepository } from "@/features/transfers/data/prisma-transfer-repository";
import { getRecentRecipients } from "@/features/transfers/domain/transfer-form";
import {
  lookupRecipient,
  submitTransfer,
} from "@/features/transfers/server/actions";
import { TransferFlow } from "@/features/transfers/ui/TransferFlow";
import { ROUTES } from "@/shared/lib/routes";
import { buttonClassName } from "@/shared/ui/Button";

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
      <main className="flex flex-col items-center px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-foreground">
          Necesitás una tarjeta para transferir
        </h1>
        <p className="mt-1 text-sm text-muted">
          El dinero sale de una de tus tarjetas, y todavía no tenés ninguna.
        </p>
        <Link
          href={ROUTES.home}
          className={buttonClassName({ size: "compact", className: "mt-8" })}
        >
          Volver al inicio
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col px-6 pt-8">
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
  );
}
