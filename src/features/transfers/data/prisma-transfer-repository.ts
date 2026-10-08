import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/shared/lib/db";

import {
  fullNameOf,
  isSameTransferRequest,
  planTransfer,
  type DestinationCard,
  type TransferFailureReason,
  type TransferOutcome,
  type TransferReceipt,
  type TransferRepository,
} from "../domain/transfer";
import type { RecentTransfersRepository } from "../domain/transfer-form";
import {
  movementReference,
  newTransferCode,
} from "../domain/transfer-reference";
import type { RecipientKey, TransferRequest } from "../domain/transfer-schema";
import { violatedUniqueIndex } from "./unique-violation";

/*
 * Isolation: the default READ COMMITTED plus a conditional debit, not SERIALIZABLE.
 *
 * The only invariant at stake under concurrency is "a balance never goes below zero", and
 * it lives in a single row. `UPDATE … SET balance = balance - x WHERE id = … AND balance >= x`
 * takes that row's lock; a concurrent transfer on the same card waits for it and then
 * PostgreSQL re-checks the WHERE against the committed balance. So the second one simply
 * matches 0 rows when the money is gone, and we answer "insufficient funds".
 * SERIALIZABLE would also be correct, but it aborts conflicting transactions (40001) and
 * forces a retry loop on every caller, for no extra guarantee here. The CHECK
 * (balance >= 0) constraint in the migration is the backstop if any code forgets the
 * condition.
 *
 * Deadlocks: A → B and B → A at the same time lock the same two card rows. Both updates
 * always run in card-id order, so concurrent transfers acquire the locks in the same order.
 *
 * Idempotency: (senderId, idempotencyKey) is unique, and the transfer row that claims the
 * key is the transaction's first write. A key already committed replays its stored
 * receipt when the request is the same one, and is refused (`idempotency_conflict`) when
 * it is not. Whenever the transaction fails, the key is looked up again before answering:
 * a twin request with the same key may have committed meanwhile, and its result is then
 * the answer (the money moved once).
 */

/** Thrown inside the transaction to roll it back with a business outcome. */
class TransferRejected extends Error {
  constructor(readonly reason: TransferFailureReason) {
    super(reason);
  }
}

/** The transaction rolled back because the drawn reference already exists. */
const REFERENCE_TAKEN = Symbol("reference taken");
const MOVEMENT_REFERENCE_INDEX = "Movement_reference_key";

/**
 * A new code collides with an existing reference about once in 2^40 / (transfers so far):
 * a second draw practically always succeeds; the third attempt is a safety margin.
 */
const MAX_REFERENCE_ATTEMPTS = 3;

const SENT_DESCRIPTION = "Transferencia enviada";
const RECEIVED_DESCRIPTION = "Transferencia recibida";

const recipientSelect = {
  id: true,
  firstName: true,
  lastName: true,
  alias: true,
  cvu: true,
} satisfies Prisma.UserSelect;

function recipientWhere(key: RecipientKey): Prisma.UserWhereUniqueInput {
  return key.kind === "alias" ? { alias: key.alias } : { cvu: key.cvu };
}

const storedTransferSelect = {
  id: true,
  recipientId: true,
  sourceCardId: true,
  amount: true,
  currency: true,
  description: true,
  createdAt: true,
  recipient: { select: { firstName: true, lastName: true, alias: true } },
  sourceCard: {
    select: { id: true, brand: true, last4: true, balance: true },
  },
  movements: { where: { type: "SENT" }, select: { id: true, reference: true } },
} satisfies Prisma.TransferSelect;

type StoredTransfer = Prisma.TransferGetPayload<{
  select: typeof storedTransferSelect;
}>;

function toReceipt(transfer: StoredTransfer): TransferReceipt {
  return {
    id: transfer.id,
    amount: transfer.amount.toFixed(2),
    currency: transfer.currency,
    description: transfer.description,
    createdAt: transfer.createdAt,
    recipient: {
      fullName: fullNameOf(transfer.recipient),
      alias: transfer.recipient.alias,
    },
    sourceCard: transfer.sourceCard
      ? {
          ...transfer.sourceCard,
          balance: transfer.sourceCard.balance.toFixed(2),
        }
      : null,
    movementId: transfer.movements[0]?.id ?? null,
    reference: transfer.movements[0]?.reference ?? null,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/** `newCode` is injectable so a test can force a reference collision. */
export function createPrismaTransferRepository({
  newCode = () => newTransferCode(),
}: { newCode?: () => string } = {}): TransferRepository {
  return {
    findRecipient,
    async execute(senderId, request) {
      for (let attempt = 1; ; attempt += 1) {
        const outcome = await executeOnce(senderId, request, newCode());
        if (outcome !== REFERENCE_TAKEN) return outcome;
        if (attempt === MAX_REFERENCE_ATTEMPTS) {
          throw new Error("Could not draw a free transfer reference");
        }
      }
    },
  };
}

function findRecipient(key: RecipientKey) {
  return db.user.findUnique({
    where: recipientWhere(key),
    select: recipientSelect,
  });
}

/** One attempt with one drawn reference code: replay, transfer, or ask for a new draw. */
async function executeOnce(
  senderId: string,
  request: TransferRequest,
  code: string,
): Promise<TransferOutcome | typeof REFERENCE_TAKEN> {
  const replayed = await replayIfKeyCommitted(senderId, request);
  if (replayed) return replayed;

  try {
    const receipt = await db.$transaction((tx) =>
      runTransfer(tx, senderId, request, code),
    );
    return { ok: true, receipt, replayed: false };
  } catch (error) {
    if (error instanceof TransferRejected) {
      // The same-key race: a duplicate can pass the key check above while its twin is
      // still running, then read the balance after the twin committed and plan against
      // the debited value ("insufficient funds"). If the key is committed by now, the
      // twin won: replay it instead of reporting a refusal for money that did move.
      const twin = await replayIfKeyCommitted(senderId, request);
      return twin ?? { ok: false, reason: error.reason };
    }
    if (isUniqueViolation(error)) {
      // Lost the race for the idempotency key: the winner has committed by now.
      const winner = await replayIfKeyCommitted(senderId, request);
      if (winner) return winner;
      // Only a taken reference earns a new draw; any other constraint is a real bug.
      if (violatedUniqueIndex(error) === MOVEMENT_REFERENCE_INDEX) {
        return REFERENCE_TAKEN;
      }
    }
    throw error;
  }
}

/** The stored answer for this key, if a transfer already committed it; else null. */
async function replayIfKeyCommitted(
  senderId: string,
  request: TransferRequest,
): Promise<TransferOutcome | null> {
  const stored = await db.transfer.findUnique({
    where: {
      senderId_idempotencyKey: {
        senderId,
        idempotencyKey: request.idempotencyKey,
      },
    },
    select: storedTransferSelect,
  });
  return stored ? replay(stored, request) : null;
}

/** Same key again: return what the first request did, if it was the same request. */
async function replay(
  stored: StoredTransfer,
  request: TransferRequest,
): Promise<TransferOutcome> {
  const recipient = await db.user.findUnique({
    where: recipientWhere(request.recipient),
    select: { id: true },
  });
  const isSameRequest = isSameTransferRequest(
    { ...stored, amount: stored.amount.toFixed(2) },
    { ...request, recipientId: recipient?.id ?? "" },
  );
  return isSameRequest
    ? { ok: true, receipt: toReceipt(stored), replayed: true }
    : { ok: false, reason: "idempotency_conflict" };
}

/**
 * The transfer itself, inside one database transaction: read both parties, let the
 * domain decide, claim the idempotency key, move the money and write both movements.
 * Any business refusal throws `TransferRejected`, which rolls everything back.
 */
async function runTransfer(
  tx: Prisma.TransactionClient,
  senderId: string,
  request: TransferRequest,
  code: string,
): Promise<TransferReceipt> {
  const { sender, recipient, sourceCard } = await readParties(
    tx,
    senderId,
    request,
  );

  const plan = planTransfer({
    senderId,
    amountCents: request.amountCents,
    recipient: recipient ? { id: recipient.id, cards: recipient.cards } : null,
    sourceCard: sourceCard
      ? { ...sourceCard, balance: sourceCard.balance.toFixed(2) }
      : null,
  });
  if (!plan.ok) throw new TransferRejected(plan.reason);
  const { destinationCard } = plan;
  // planTransfer guarantees both exist past this point.
  if (!recipient || !sourceCard) {
    throw new Error("Unreachable: planTransfer accepted a missing party");
  }

  const now = new Date();
  // Inserted first: it claims the idempotency key. A concurrent request with the same key
  // blocks on the unique index until this transaction ends, then fails with P2002 and
  // replays this result instead of moving the money again.
  const transfer = await tx.transfer.create({
    data: {
      senderId,
      recipientId: recipient.id,
      sourceCardId: sourceCard.id,
      destinationCardId: destinationCard.id,
      amount: request.amount,
      currency: sourceCard.currency,
      description: request.description ?? null,
      idempotencyKey: request.idempotencyKey,
      createdAt: now,
    },
    select: { id: true },
  });

  await moveMoney(tx, {
    senderId,
    sourceCardId: sourceCard.id,
    destinationCard,
    amount: request.amount,
  });

  const movement = {
    amount: request.amount,
    currency: sourceCard.currency,
    status: "COMPLETED",
    occurredAt: now,
    transferId: transfer.id,
  } as const;
  await tx.movement.create({
    data: {
      ...movement,
      userId: recipient.id,
      cardId: destinationCard.id,
      counterparty: fullNameOf(sender),
      description: request.description ?? RECEIVED_DESCRIPTION,
      type: "RECEIVED",
      reference: movementReference(code, "RECEIVED"),
    },
  });
  await tx.movement.create({
    data: {
      ...movement,
      userId: senderId,
      cardId: sourceCard.id,
      counterparty: fullNameOf(recipient),
      description: request.description ?? SENT_DESCRIPTION,
      type: "SENT",
      reference: movementReference(code, "SENT"),
    },
  });

  const stored = await tx.transfer.findUniqueOrThrow({
    where: { id: transfer.id },
    select: storedTransferSelect,
  });
  return toReceipt(stored);
}

/** The sender, the recipient (with every card) and the source card, read in parallel. */
async function readParties(
  tx: Prisma.TransactionClient,
  senderId: string,
  request: TransferRequest,
) {
  const [sender, recipient, sourceCard] = await Promise.all([
    tx.user.findUniqueOrThrow({
      where: { id: senderId },
      select: { firstName: true, lastName: true },
    }),
    tx.user.findUnique({
      where: recipientWhere(request.recipient),
      select: {
        ...recipientSelect,
        // Every card, primary first: `planTransfer` credits the first one in the
        // source card's currency. The id makes the order total, so it never changes.
        cards: {
          select: { id: true, currency: true },
          orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
        },
      },
    }),
    // Scoped to the sender: someone else's card id is simply "not found".
    tx.card.findFirst({
      where: request.cardId
        ? { id: request.cardId, userId: senderId }
        : { userId: senderId, isPrimary: true },
      select: { id: true, currency: true, balance: true },
    }),
  ]);
  return { sender, recipient, sourceCard };
}

/**
 * Debit the source card and credit the destination one, locking the two card rows in
 * card-id order (see Deadlocks above). The debit is conditional on the balance: that,
 * not the earlier read, is what guarantees no overdraft.
 */
async function moveMoney(
  tx: Prisma.TransactionClient,
  {
    senderId,
    sourceCardId,
    destinationCard,
    amount,
  }: {
    senderId: string;
    sourceCardId: string;
    destinationCard: DestinationCard;
    amount: string;
  },
): Promise<void> {
  const debit = async () => {
    const { count } = await tx.card.updateMany({
      where: { id: sourceCardId, userId: senderId, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    // The balance read before planning may be stale by now: this is the check that counts.
    if (count !== 1) throw new TransferRejected("insufficient_funds");
  };
  const credit = () =>
    tx.card.update({
      where: { id: destinationCard.id },
      data: { balance: { increment: amount } },
    });

  if (sourceCardId < destinationCard.id) {
    await debit();
    await credit();
  } else {
    await credit();
    await debit();
  }
}

export const prismaTransferRepository = createPrismaTransferRepository();

export const prismaRecentTransfersRepository: RecentTransfersRepository = {
  findRecentTransfers(userId, take) {
    return db.transfer.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      // The id breaks ties between transfers stored with the same timestamp, so the
      // order (and the quick picks built from it) never changes between two reads.
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: {
        sender: { select: recipientSelect },
        recipient: { select: recipientSelect },
      },
    });
  },
};
