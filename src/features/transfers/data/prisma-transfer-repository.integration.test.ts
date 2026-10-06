import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { buildCvu } from "@/features/account/domain/account-identifiers";
import { db } from "@/shared/lib/db";

import { sendTransfer } from "../domain/transfer";
import {
  createPrismaTransferRepository,
  prismaRecentTransfersRepository,
  prismaTransferRepository as repository,
} from "./prisma-transfer-repository";
import { getRecentRecipients } from "../domain/transfer-form";
import { newTransferCode } from "../domain/transfer-reference";

/*
 * Runs real transfers against PostgreSQL: atomicity, the conditional debit under
 * concurrency, and idempotent replays. Every test creates its own users (unique alias and
 * CVU per run) and everything is deleted afterwards (cards, movements and transfers
 * cascade), so it neither needs nor touches the seed data.
 */

const RUN_ID = randomUUID().slice(0, 8);
const createdUserIds: string[] = [];
let sequence = 0;

type Account = {
  userId: string;
  alias: string;
  cvu: string;
  cardId: string;
};

async function createAccount(
  label: string,
  balance: string,
  { currency = "USD" }: { currency?: string } = {},
): Promise<Account> {
  sequence += 1;
  const alias = `it.${RUN_ID}.${sequence}`;
  const cvu = buildCvu(
    "0000099",
    `${Number.parseInt(RUN_ID, 16)}${sequence}`.padStart(13, "0").slice(-13),
  );
  const user = await db.user.create({
    data: {
      email: `it-transfer-${label}-${RUN_ID}-${sequence}@granabank.test`,
      passwordHash: "not-a-real-hash",
      firstName: "Integration",
      lastName: label,
      alias,
      cvu,
      cards: {
        create: {
          brand: "MASTERCARD",
          last4: "4242",
          holderName: `Integration ${label}`,
          expMonth: 1,
          expYear: 2031,
          balance,
          currency,
          isPrimary: true,
        },
      },
    },
    include: { cards: true },
  });
  createdUserIds.push(user.id);
  return { userId: user.id, alias, cvu, cardId: user.cards[0].id };
}

async function balanceOf(cardId: string): Promise<string> {
  const card = await db.card.findUniqueOrThrow({ where: { id: cardId } });
  return card.balance.toFixed(2);
}

function send(
  from: Account,
  body: Record<string, unknown>,
): ReturnType<typeof sendTransfer> {
  return sendTransfer(repository, from.userId, {
    idempotencyKey: randomUUID(),
    ...body,
  });
}

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await db.$disconnect();
});

describe("prismaTransferRepository (PostgreSQL)", () => {
  it("moves the money and records both movements, linked to the transfer", async () => {
    const sender = await createAccount("Sender", "100.00");
    const recipient = await createAccount("Recipient", "5.00");

    const result = await send(sender, {
      recipient: recipient.alias.toUpperCase(),
      amount: "30.50",
      description: "Entradas",
    });

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      receipt: {
        amount: "30.50",
        currency: "USD",
        description: "Entradas",
        recipient: {
          fullName: "Integration Recipient",
          alias: recipient.alias,
        },
        sourceCard: { id: sender.cardId, balance: "69.50" },
      },
    });
    expect(await balanceOf(sender.cardId)).toBe("69.50");
    expect(await balanceOf(recipient.cardId)).toBe("35.50");

    const transferId = result.ok ? result.receipt.id : "";
    const movements = await db.movement.findMany({
      where: { transferId },
      orderBy: { type: "asc" },
    });
    expect(
      movements.map((m) => ({
        userId: m.userId,
        cardId: m.cardId,
        type: m.type,
        status: m.status,
        amount: m.amount.toFixed(2),
        counterparty: m.counterparty,
        description: m.description,
      })),
    ).toEqual([
      {
        userId: recipient.userId,
        cardId: recipient.cardId,
        type: "RECEIVED",
        status: "COMPLETED",
        amount: "30.50",
        counterparty: "Integration Sender",
        description: "Entradas",
      },
      {
        userId: sender.userId,
        cardId: sender.cardId,
        type: "SENT",
        status: "COMPLETED",
        amount: "30.50",
        counterparty: "Integration Recipient",
        description: "Entradas",
      },
    ]);
    expect(result.ok && result.receipt.movementId).toBe(
      movements.find((m) => m.type === "SENT")?.id,
    );
    // Both sides share one short code; each movement keeps a unique reference.
    const code = /^ENV-([0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4})$/.exec(
      result.ok ? (result.receipt.reference ?? "") : "",
    )?.[1];
    expect(code).toBeDefined();
    expect(movements.map((m) => m.reference)).toEqual([
      `REC-${code}`,
      `ENV-${code}`,
    ]);
  });

  it("draws a new code when the reference is already taken", async () => {
    const sender = await createAccount("Sender", "10.00");
    const recipient = await createAccount("Recipient", "0.00");
    const taken = newTransferCode();
    const fresh = newTransferCode();
    const first = await send(sender, { recipient: recipient.alias, amount: 1 });
    expect(first.ok).toBe(true);
    await db.movement.update({
      where: { id: first.ok ? (first.receipt.movementId ?? "") : "" },
      data: { reference: `ENV-${taken}` },
    });

    const codes = [taken, fresh];
    const unlucky = createPrismaTransferRepository({
      newCode: () => codes.shift() ?? newTransferCode(),
    });
    const result = await sendTransfer(unlucky, sender.userId, {
      idempotencyKey: randomUUID(),
      recipient: recipient.alias,
      amount: 2,
    });

    expect(result).toMatchObject({
      ok: true,
      receipt: { reference: `ENV-${fresh}` },
    });
    expect(await balanceOf(sender.cardId)).toBe("7.00");
    expect(await balanceOf(recipient.cardId)).toBe("3.00");
  });

  it("orders transfers made at the same instant deterministically", async () => {
    const me = await createAccount("Me", "50.00");
    const first = await createAccount("First", "50.00");
    const second = await createAccount("Second", "50.00");
    const createdAt = new Date("2026-01-01T12:00:00Z");
    const ids: string[] = [];
    for (const recipient of [first, second]) {
      const transfer = await db.transfer.create({
        data: {
          senderId: me.userId,
          recipientId: recipient.userId,
          amount: "1.00",
          currency: "USD",
          idempotencyKey: randomUUID(),
          createdAt,
        },
      });
      ids.push(transfer.id);
    }
    const newestFirst = [...ids].sort().reverse();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const transfers =
        await prismaRecentTransfersRepository.findRecentTransfers(me.userId, 2);
      expect(transfers.map((transfer) => transfer.recipient.id)).toEqual(
        newestFirst.map((id) => (id === ids[0] ? first.userId : second.userId)),
      );
    }
  });

  it("lists recent counterparties both ways, newest first, once each", async () => {
    const me = await createAccount("Me", "50.00");
    const friend = await createAccount("Friend", "50.00");
    const other = await createAccount("Other", "50.00");

    await send(me, { recipient: friend.alias, amount: "1" });
    await send(other, { recipient: me.alias, amount: "2" });
    await send(me, { recipient: friend.alias, amount: "3" });

    const recipients = await getRecentRecipients(
      prismaRecentTransfersRepository,
      me.userId,
    );
    expect(recipients.map((recipient) => recipient.query)).toEqual([
      friend.alias,
      other.alias,
    ]);
    expect(recipients[0]).toMatchObject({ fullName: "Integration Friend" });
  });

  it("finds the recipient by CVU and describes the movements by default", async () => {
    const sender = await createAccount("Sender", "10.00");
    const recipient = await createAccount("Recipient", "0.00");

    const result = await send(sender, { recipient: recipient.cvu, amount: 10 });

    expect(result.ok).toBe(true);
    expect(await balanceOf(sender.cardId)).toBe("0.00");
    const descriptions = await db.movement.findMany({
      where: { transferId: result.ok ? result.receipt.id : "" },
      select: { type: true, description: true },
      orderBy: { type: "asc" },
    });
    expect(descriptions).toEqual([
      { type: "RECEIVED", description: "Transferencia recibida" },
      { type: "SENT", description: "Transferencia enviada" },
    ]);
  });

  describe("rejections leave everything untouched", () => {
    async function snapshot(...accounts: Account[]) {
      const ids = accounts.map((a) => a.userId);
      return {
        balances: await Promise.all(accounts.map((a) => balanceOf(a.cardId))),
        movements: await db.movement.count({ where: { userId: { in: ids } } }),
        transfers: await db.transfer.count({
          where: {
            OR: [{ senderId: { in: ids } }, { recipientId: { in: ids } }],
          },
        }),
      };
    }

    it("insufficient funds", async () => {
      const sender = await createAccount("Sender", "20.00");
      const recipient = await createAccount("Recipient", "1.00");
      const before = await snapshot(sender, recipient);

      const result = await send(sender, {
        recipient: recipient.alias,
        amount: "20.01",
      });

      expect(result).toEqual({ ok: false, reason: "insufficient_funds" });
      expect(await snapshot(sender, recipient)).toEqual(before);
    });

    // self transfer (own alias), unknown alias, someone else's card, another currency.
    it.each([
      "self_transfer",
      "recipient_not_found",
      "card_not_found",
      "currency_mismatch",
    ] as const)("%s", async (reason) => {
      const sender = await createAccount("Sender", "50.00");
      const recipient = await createAccount("Recipient", "1.00");
      const pesos = await createAccount("Pesos", "50.00", { currency: "ARS" });
      const before = await snapshot(sender, recipient, pesos);

      const body = {
        self_transfer: { recipient: sender.alias, amount: "1" },
        recipient_not_found: { recipient: `nadie.${RUN_ID}`, amount: "1" },
        card_not_found: {
          recipient: recipient.alias,
          amount: "1",
          cardId: recipient.cardId,
        },
        currency_mismatch: { recipient: pesos.alias, amount: "1" },
      }[reason];

      await expect(send(sender, body)).resolves.toEqual({ ok: false, reason });
      expect(await snapshot(sender, recipient, pesos)).toEqual(before);
    });
  });

  describe("idempotency", () => {
    it("replays the original result for the same key instead of paying twice", async () => {
      const sender = await createAccount("Sender", "100.00");
      const recipient = await createAccount("Recipient", "0.00");
      const body = {
        recipient: recipient.alias,
        amount: "25",
        idempotencyKey: randomUUID(),
      };

      const first = await sendTransfer(repository, sender.userId, body);
      const second = await sendTransfer(repository, sender.userId, body);

      expect(first).toMatchObject({ ok: true, replayed: false });
      expect(second).toMatchObject({ ok: true, replayed: true });
      expect(second.ok && second.receipt.id).toBe(first.ok && first.receipt.id);
      expect(second.ok && second.receipt.movementId).toBe(
        first.ok && first.receipt.movementId,
      );
      expect(await balanceOf(sender.cardId)).toBe("75.00");
      expect(await balanceOf(recipient.cardId)).toBe("25.00");
      await expect(
        db.movement.count({
          where: { userId: { in: [sender.userId, recipient.userId] } },
        }),
      ).resolves.toBe(2);
    });

    it("refuses a reused key carrying a different transfer", async () => {
      const sender = await createAccount("Sender", "100.00");
      const recipient = await createAccount("Recipient", "0.00");
      const idempotencyKey = randomUUID();

      await sendTransfer(repository, sender.userId, {
        recipient: recipient.alias,
        amount: "10",
        idempotencyKey,
      });
      const reused = await sendTransfer(repository, sender.userId, {
        recipient: recipient.alias,
        amount: "11",
        idempotencyKey,
      });

      expect(reused).toEqual({ ok: false, reason: "idempotency_conflict" });
      expect(await balanceOf(sender.cardId)).toBe("90.00");
    });

    it("scopes keys per sender: another user may use the same key", async () => {
      const first = await createAccount("First", "10.00");
      const second = await createAccount("Second", "10.00");
      const recipient = await createAccount("Recipient", "0.00");
      const idempotencyKey = randomUUID();
      const body = { recipient: recipient.alias, amount: "1", idempotencyKey };

      const results = await Promise.all([
        sendTransfer(repository, first.userId, body),
        sendTransfer(repository, second.userId, body),
      ]);

      expect(results.map((r) => r.ok && r.replayed)).toEqual([false, false]);
      expect(await balanceOf(recipient.cardId)).toBe("2.00");
    });

    it("moves the money once when the same request races itself (double tap)", async () => {
      const sender = await createAccount("Sender", "100.00");
      const recipient = await createAccount("Recipient", "0.00");
      const body = {
        recipient: recipient.alias,
        amount: "40",
        idempotencyKey: randomUUID(),
      };

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          sendTransfer(repository, sender.userId, body),
        ),
      );

      expect(results.every((r) => r.ok)).toBe(true);
      expect(new Set(results.map((r) => r.ok && r.receipt.id)).size).toBe(1);
      expect(results.filter((r) => r.ok && !r.replayed)).toHaveLength(1);
      expect(await balanceOf(sender.cardId)).toBe("60.00");
      expect(await balanceOf(recipient.cardId)).toBe("40.00");
    });

    it("replays, never rejects, a duplicate that reads the balance after the original commits", async () => {
      // Sending the whole balance: a duplicate that plans against the already-debited
      // balance would see "insufficient funds" unless it notices the committed key.
      // The interleaving is timing-dependent: the duplicate starts 0–14 ms after the
      // original, sweeping the window between its key check and its balance read.
      for (let round = 0; round < 15; round += 1) {
        const sender = await createAccount("Sender", "30.00");
        const recipient = await createAccount("Recipient", "0.00");
        const body = {
          recipient: recipient.alias,
          amount: "30",
          idempotencyKey: randomUUID(),
        };

        const results = await Promise.all([
          sendTransfer(repository, sender.userId, body),
          new Promise((resolve) => setTimeout(resolve, round)).then(() =>
            sendTransfer(repository, sender.userId, body),
          ),
        ]);

        expect(results.map((r) => (r.ok ? "ok" : r.reason))).toEqual([
          "ok",
          "ok",
        ]);
        expect(await balanceOf(sender.cardId)).toBe("0.00");
      }
    });
  });

  describe("concurrency", () => {
    it("never overdraws: of N parallel transfers only the affordable ones succeed", async () => {
      const sender = await createAccount("Sender", "100.00");
      const recipient = await createAccount("Recipient", "0.00");

      // 8 × 15.00 = 120.00 against a 100.00 balance: exactly 6 fit.
      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          send(sender, { recipient: recipient.alias, amount: "15.00" }),
        ),
      );

      const succeeded = results.filter((r) => r.ok);
      const rejected = results.filter((r) => !r.ok);
      expect(succeeded).toHaveLength(6);
      expect(rejected).toEqual(
        Array.from({ length: 2 }, () => ({
          ok: false,
          reason: "insufficient_funds",
        })),
      );
      expect(await balanceOf(sender.cardId)).toBe("10.00");
      expect(await balanceOf(recipient.cardId)).toBe("90.00");
      await expect(
        db.movement.count({ where: { userId: sender.userId, type: "SENT" } }),
      ).resolves.toBe(6);
    });

    it("does not deadlock when two users send to each other at the same time", async () => {
      const a = await createAccount("A", "50.00");
      const b = await createAccount("B", "50.00");

      const results = await Promise.all(
        Array.from({ length: 6 }, (_, index) =>
          index % 2 === 0
            ? send(a, { recipient: b.alias, amount: "5" })
            : send(b, { recipient: a.alias, amount: "3" }),
        ),
      );

      expect(results.every((r) => r.ok)).toBe(true);
      // A: 50 − 3×5 + 3×3 = 44; B: 50 + 15 − 9 = 56.
      expect(await balanceOf(a.cardId)).toBe("44.00");
      expect(await balanceOf(b.cardId)).toBe("56.00");
    });

    it("keeps the database guard: a card balance can never be negative", async () => {
      const account = await createAccount("Guard", "1.00");

      await expect(
        db.card.update({
          where: { id: account.cardId },
          data: { balance: { decrement: "2.00" } },
        }),
      ).rejects.toThrow();
      expect(await balanceOf(account.cardId)).toBe("1.00");
    });
  });

  it("previews the recipient through findRecipient", async () => {
    const recipient = await createAccount("Preview", "0.00");

    await expect(
      repository.findRecipient({ kind: "cvu", cvu: recipient.cvu }),
    ).resolves.toMatchObject({ id: recipient.userId, alias: recipient.alias });
    await expect(
      repository.findRecipient({ kind: "alias", alias: `nadie.${RUN_ID}` }),
    ).resolves.toBeNull();
  });
});
