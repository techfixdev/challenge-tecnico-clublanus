import "dotenv/config";

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { buildCvu } from "../src/features/account/domain/account-identifiers";
import { buildDemoPan } from "../src/features/account/domain/card-number";
import { seedDate } from "../src/features/movements/domain/seed-date";
import { movementReference } from "../src/features/transfers/domain/transfer-reference";
import {
  PrismaClient,
  type CardBrand,
  type MovementType,
  type Prisma,
} from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// Fixed CVUs (valid check digits, GranaBank's made-up entity 0000003): deterministic seed.
const DEMO_USER = {
  email: "soygranate@clublanus.com",
  password: "GRANATE1@",
  firstName: "Granate",
  lastName: "Lanús",
  alias: "soy.granate.lanus",
  cvu: buildCvu("0000003", "1000000000017"),
  cardHolder: "Soy Granate",
} as const;

/** Second demo user, so transfers can go both ways. */
const SECOND_USER = {
  email: "hincha@clublanus.com",
  password: "GRANATE2@",
  firstName: "Hincha",
  lastName: "Granate",
  alias: "hincha.granate",
  cvu: buildCvu("0000003", "1000000000025"),
  cardHolder: "Hincha Granate",
} as const;

/**
 * Fictional people the demo user sent money to before, so "Recientes" on the send screen
 * is a strip worth dragging. They have no known password (a random one, hashed and
 * forgotten): they exist to receive, never to log in.
 */
const PAST_RECIPIENTS = [
  {
    email: "valentina.sosa@correo.example",
    firstName: "Valentina",
    lastName: "Sosa",
    alias: "valen.granate",
    cvu: buildCvu("0000003", "1000000000033"),
    cardHolder: "Valentina Sosa",
  },
  {
    email: "matias.herrera@correo.example",
    firstName: "Matías",
    lastName: "Herrera",
    alias: "mati.granate",
    cvu: buildCvu("0000003", "1000000000041"),
    cardHolder: "Matias Herrera",
  },
  {
    email: "camila.benitez@correo.example",
    firstName: "Camila",
    lastName: "Benítez",
    alias: "cami.granate",
    cvu: buildCvu("0000003", "1000000000058"),
    cardHolder: "Camila Benitez",
  },
  {
    email: "nicolas.acosta@correo.example",
    firstName: "Nicolás",
    lastName: "Acosta",
    alias: "nico.granate",
    cvu: buildCvu("0000003", "1000000000066"),
    cardHolder: "Nicolas Acosta",
  },
  {
    email: "florencia.rios@correo.example",
    firstName: "Florencia",
    lastName: "Ríos",
    alias: "flor.granate",
    cvu: buildCvu("0000003", "1000000000074"),
    cardHolder: "Florencia Rios",
  },
] as const;

type CardSeed = {
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  balance: string;
  currency: "USD" | "ARS";
};

/** A user's two cards: the primary one Home shows first, and a second one. */
type UserCards = { primary: CardSeed; secondary: CardSeed };

/** Balances are seed facts the e2e specs assert (they already include PAST_TRANSFERS). */
const DEMO_USER_CARDS: UserCards = {
  primary: {
    brand: "MASTERCARD",
    last4: "1234",
    expMonth: 2,
    expYear: 2030,
    balance: "978.85",
    currency: "USD",
  },
  // The peso account: Argentine banks pair a dollar and a peso card.
  secondary: {
    brand: "VISA",
    last4: "5678",
    expMonth: 11,
    expYear: 2028,
    balance: "312400.50",
    currency: "ARS",
  },
};

const SECOND_USER_CARDS: UserCards = {
  primary: {
    brand: "VISA",
    last4: "1910",
    expMonth: 1,
    expYear: 2031,
    balance: "650.00",
    currency: "USD",
  },
  // So a peso transfer to the second user has a peso card to land on (no FX).
  secondary: {
    brand: "MASTERCARD",
    last4: "1915",
    expMonth: 6,
    expYear: 2030,
    balance: "185000.00",
    currency: "ARS",
  },
};

/**
 * A past recipient's cards: a dollar and a peso one, so a new transfer in either
 * currency has a card to land on. The last four digits tell them apart.
 */
function pastRecipientCards(index: number): UserCards {
  const serial = String(index + 1).padStart(2, "0");
  return {
    primary: {
      brand: "VISA",
      last4: `20${serial}`,
      expMonth: 4,
      expYear: 2030,
      balance: "120.00",
      currency: "USD",
    },
    secondary: {
      brand: "MASTERCARD",
      last4: `30${serial}`,
      expMonth: 9,
      expYear: 2029,
      balance: "54000.00",
      currency: "ARS",
    },
  };
}

type UserSeed = {
  email: string;
  firstName: string;
  lastName: string;
  alias: string;
  cvu: string;
  cardHolder: string;
};

const DESCRIPTION: Record<MovementType, string> = {
  SUBSCRIPTION: "Pago de suscripción",
  RECEIVED: "Pago recibido",
  SENT: "Pago enviado",
};

type MovementSeed = {
  counterparty: string;
  type: MovementType;
  amount: string;
  daysAgo: number;
  hour: number;
  card?: "primary" | "secondary";
  pending?: boolean;
};

// Ordered newest first; the first rows match the "Últimos movimientos" list in the design.
// Amounts are in the card's currency: dollars on the primary Mastercard, pesos on the
// secondary Visa ("card: secondary").
const DEMO_USER_MOVEMENTS: MovementSeed[] = [
  {
    counterparty: "Adobe",
    type: "SUBSCRIPTION",
    amount: "125.00",
    daysAgo: 0,
    hour: 9,
  },
  {
    counterparty: "Ronaldo",
    type: "RECEIVED",
    amount: "95.00",
    daysAgo: 1,
    hour: 18,
  },
  {
    counterparty: "Figma",
    type: "SUBSCRIPTION",
    amount: "125.00",
    daysAgo: 2,
    hour: 10,
  },
  {
    counterparty: "Juan Perez",
    type: "SENT",
    amount: "95.00",
    daysAgo: 3,
    hour: 13,
  },
  {
    counterparty: "José Suárez",
    type: "RECEIVED",
    amount: "95.00",
    daysAgo: 4,
    hour: 16,
  },
  {
    counterparty: "Juan Rodríguez",
    type: "SENT",
    amount: "95.00",
    daysAgo: 5,
    hour: 11,
    pending: true,
  },
  // A peso debit this month, so the summary's peso line is not empty. Right after the
  // pending transfer: older than the five Home shows. In the current month from the
  // 6th on (dates are relative to the seed run, like every other movement).
  {
    counterparty: "Disney+",
    type: "SUBSCRIPTION",
    amount: "9499.00",
    daysAgo: 5,
    hour: 9,
    card: "secondary",
  },
  {
    counterparty: "Julio César",
    type: "RECEIVED",
    amount: "95.00",
    daysAgo: 7,
    hour: 20,
  },
  {
    counterparty: "Mariano Martínez",
    type: "SENT",
    amount: "95.00",
    daysAgo: 8,
    hour: 12,
  },
  {
    counterparty: "Spotify",
    type: "SUBSCRIPTION",
    amount: "10.99",
    daysAgo: 10,
    hour: 8,
  },
  {
    counterparty: "Netflix",
    type: "SUBSCRIPTION",
    amount: "11999.00",
    daysAgo: 12,
    hour: 7,
    card: "secondary",
  },
  {
    counterparty: "Lucía Fernández",
    type: "RECEIVED",
    amount: "240.00",
    daysAgo: 14,
    hour: 15,
  },
  {
    counterparty: "Google One",
    type: "SUBSCRIPTION",
    amount: "2499.00",
    daysAgo: 16,
    hour: 9,
    card: "secondary",
  },
  {
    counterparty: "Martín Gómez",
    type: "SENT",
    amount: "60.00",
    daysAgo: 19,
    hour: 19,
  },
  {
    counterparty: "Ronaldo",
    type: "RECEIVED",
    amount: "150.00",
    daysAgo: 22,
    hour: 17,
  },
  {
    counterparty: "Juan Perez",
    type: "SENT",
    amount: "35.50",
    daysAgo: 25,
    hour: 14,
  },
  {
    counterparty: "Adobe",
    type: "SUBSCRIPTION",
    amount: "125.00",
    daysAgo: 30,
    hour: 9,
  },
  {
    counterparty: "Figma",
    type: "SUBSCRIPTION",
    amount: "125.00",
    daysAgo: 32,
    hour: 10,
  },
  {
    counterparty: "José Suárez",
    type: "RECEIVED",
    amount: "320.00",
    daysAgo: 35,
    hour: 12,
  },
  {
    counterparty: "Sofía Romero",
    type: "SENT",
    amount: "45000.00",
    daysAgo: 38,
    hour: 21,
    card: "secondary",
  },
  {
    counterparty: "Spotify",
    type: "SUBSCRIPTION",
    amount: "10.99",
    daysAgo: 40,
    hour: 8,
  },
  {
    counterparty: "Julio César",
    type: "RECEIVED",
    amount: "75.00",
    daysAgo: 44,
    hour: 16,
  },
  {
    counterparty: "Netflix",
    type: "SUBSCRIPTION",
    amount: "11999.00",
    daysAgo: 42,
    hour: 7,
    card: "secondary",
  },
  {
    counterparty: "Mariano Martínez",
    type: "SENT",
    amount: "120.00",
    daysAgo: 48,
    hour: 13,
  },
  {
    counterparty: "Juan Rodríguez",
    type: "RECEIVED",
    amount: "65.00",
    daysAgo: 53,
    hour: 18,
  },
  {
    counterparty: "Google One",
    type: "SUBSCRIPTION",
    amount: "2.99",
    daysAgo: 46,
    hour: 9,
  },
  {
    counterparty: "Lucía Fernández",
    type: "SENT",
    amount: "210.00",
    daysAgo: 58,
    hour: 11,
  },
];

const SECOND_USER_MOVEMENTS: MovementSeed[] = [
  {
    counterparty: "Spotify",
    type: "SUBSCRIPTION",
    amount: "10.99",
    daysAgo: 2,
    hour: 8,
  },
  {
    counterparty: "Club Atlético Lanús",
    type: "SENT",
    amount: "45.00",
    daysAgo: 6,
    hour: 19,
  },
  {
    counterparty: "Diego Ramírez",
    type: "RECEIVED",
    amount: "200.00",
    daysAgo: 9,
    hour: 14,
  },
  {
    counterparty: "Netflix",
    type: "SUBSCRIPTION",
    amount: "15.49",
    daysAgo: 15,
    hour: 7,
  },
];

type PastTransferSeed = {
  /** Fixed code and idempotency key: the seed is deterministic. */
  code: string;
  idempotencyKey: string;
  /** Who received it: the second demo user, or one of PAST_RECIPIENTS. */
  recipient: UserSeed;
  amount: string;
  currency: "USD" | "ARS";
  description: string;
  daysAgo: number;
  hour: number;
};

/**
 * Past transfers sent by the demo user, newest first: the second demo user (so transfers
 * go both ways), then the past recipients, so "Recientes" shows six people. Older than
 * every other movement, so Home and the first page of Movements stay as in the design.
 * Card balances are seed facts that already include them (they move no money now).
 */
const PAST_TRANSFERS: PastTransferSeed[] = [
  {
    code: "SEED-0001",
    idempotencyKey: "00000000-0000-4000-8000-000000000001",
    recipient: SECOND_USER,
    amount: "25.00",
    currency: "USD",
    description: "Entradas para la cancha",
    daysAgo: 60,
    hour: 18,
  },
  {
    code: "SEED-0002",
    idempotencyKey: "00000000-0000-4000-8000-000000000002",
    recipient: PAST_RECIPIENTS[0],
    amount: "18500.00",
    currency: "ARS",
    description: "Asado del domingo",
    daysAgo: 62,
    hour: 21,
  },
  {
    code: "SEED-0003",
    idempotencyKey: "00000000-0000-4000-8000-000000000003",
    recipient: PAST_RECIPIENTS[1],
    amount: "40.00",
    currency: "USD",
    description: "Camiseta alternativa",
    daysAgo: 64,
    hour: 12,
  },
  {
    code: "SEED-0004",
    idempotencyKey: "00000000-0000-4000-8000-000000000004",
    recipient: PAST_RECIPIENTS[2],
    amount: "12000.00",
    currency: "ARS",
    description: "Cuota de la peña",
    daysAgo: 66,
    hour: 19,
  },
  {
    code: "SEED-0005",
    idempotencyKey: "00000000-0000-4000-8000-000000000005",
    recipient: PAST_RECIPIENTS[3],
    amount: "15.00",
    currency: "USD",
    description: "Viaje a la cancha",
    daysAgo: 68,
    hour: 10,
  },
  {
    code: "SEED-0006",
    idempotencyKey: "00000000-0000-4000-8000-000000000006",
    recipient: PAST_RECIPIENTS[4],
    amount: "30000.00",
    currency: "ARS",
    description: "Regalo de cumpleaños",
    daysAgo: 70,
    hour: 17,
  },
];

/** Upserts the user by email, keeping its id (and so the sessions) across runs. */
async function upsertUser(
  tx: Prisma.TransactionClient,
  seed: UserSeed,
  passwordHash: string,
) {
  const data = {
    passwordHash,
    firstName: seed.firstName,
    lastName: seed.lastName,
    alias: seed.alias,
    cvu: seed.cvu,
  };
  return tx.user.upsert({
    where: { email: seed.email },
    update: data,
    create: { email: seed.email, ...data },
  });
}

type SeededCard = { id: string; currency: string };

/** Creates one of `owner`'s cards. */
function createCard(
  tx: Prisma.TransactionClient,
  userId: string,
  owner: UserSeed,
  card: CardSeed,
  isPrimary: boolean,
) {
  return tx.card.create({
    data: {
      userId,
      ...card,
      // Fictitious, Luhn-valid and stable across re-seeds (seeded by the owner's email).
      pan: buildDemoPan(card.brand, card.last4, owner.email),
      holderName: owner.cardHolder,
      isPrimary,
    },
  });
}

/** Creates `owner`'s primary card, then the second one. */
async function createCards(
  tx: Prisma.TransactionClient,
  userId: string,
  owner: UserSeed,
  cards: UserCards,
) {
  const primary = await createCard(tx, userId, owner, cards.primary, true);
  const secondary = await createCard(tx, userId, owner, cards.secondary, false);
  return { primary, secondary };
}

/**
 * The rows to insert for `seeds`: each on the card it names (the primary by default),
 * in that card's currency, with a reference numbered in list order after
 * `referencePrefix`.
 */
function toMovementRows(
  userId: string,
  seeds: MovementSeed[],
  cards: { primary: SeededCard; secondary: SeededCard },
  referencePrefix: string,
) {
  return seeds.map((movement, index) => {
    const card =
      movement.card === "secondary" ? cards.secondary : cards.primary;
    return {
      userId,
      cardId: card.id,
      counterparty: movement.counterparty,
      description: DESCRIPTION[movement.type],
      type: movement.type,
      amount: movement.amount,
      // A movement is always in its card's currency.
      currency: card.currency,
      status: movement.pending ? ("PENDING" as const) : ("COMPLETED" as const),
      reference: `${referencePrefix}${String(index + 1).padStart(6, "0")}`,
      occurredAt: seedDate(movement.daysAgo, movement.hour),
    };
  });
}

type SeededUser = {
  id: string;
  seed: UserSeed;
  cards: { primary: SeededCard; secondary: SeededCard };
};

/** The user's card in `currency`: where a transfer in it is debited or credited. */
function cardIn(user: SeededUser, currency: string): SeededCard {
  const card = [user.cards.primary, user.cards.secondary].find(
    (candidate) => candidate.currency === currency,
  );
  if (!card) throw new Error(`${user.seed.email} has no ${currency} card`);
  return card;
}

/** One past transfer, with its two movements: sent by `sender`, received by `recipient`. */
async function createPastTransfer(
  tx: Prisma.TransactionClient,
  transfer: PastTransferSeed,
  sender: SeededUser,
  recipient: SeededUser,
) {
  const transferAt = seedDate(transfer.daysAgo, transfer.hour);
  const sourceCardId = cardIn(sender, transfer.currency).id;
  const destinationCardId = cardIn(recipient, transfer.currency).id;
  const transferMovement = {
    amount: transfer.amount,
    currency: transfer.currency,
    description: transfer.description,
    status: "COMPLETED",
    occurredAt: transferAt,
  } as const;
  await tx.transfer.create({
    data: {
      senderId: sender.id,
      recipientId: recipient.id,
      sourceCardId,
      destinationCardId,
      amount: transfer.amount,
      currency: transfer.currency,
      description: transfer.description,
      idempotencyKey: transfer.idempotencyKey,
      createdAt: transferAt,
      movements: {
        create: [
          {
            ...transferMovement,
            userId: sender.id,
            cardId: sourceCardId,
            counterparty: `${recipient.seed.firstName} ${recipient.seed.lastName}`,
            type: "SENT",
            reference: movementReference(transfer.code, "SENT"),
          },
          {
            ...transferMovement,
            userId: recipient.id,
            cardId: destinationCardId,
            counterparty: `${sender.seed.firstName} ${sender.seed.lastName}`,
            type: "RECEIVED",
            reference: movementReference(transfer.code, "RECEIVED"),
          },
        ],
      },
    },
  });
}

async function main() {
  // Hashed before the transaction: bcrypt is slow on purpose and must not hold it open.
  // The past recipients get a random password nobody keeps.
  const [demoHash, secondHash, ...recipientHashes] = await Promise.all(
    [
      DEMO_USER.password,
      SECOND_USER.password,
      ...PAST_RECIPIENTS.map(() => randomUUID()),
    ].map((password) => bcrypt.hash(password, 10)),
  );

  // One interactive transaction: the upserts, the wipe and the recreate either all apply or
  // none do, so a failure half-way never leaves a demo user without cards or movements.
  const counts = await prisma.$transaction(async (tx) => {
    const demo = await upsertUser(tx, DEMO_USER, demoHash);
    const second = await upsertUser(tx, SECOND_USER, secondHash);
    const recipients = [];
    for (const [index, recipient] of PAST_RECIPIENTS.entries()) {
      recipients.push(await upsertUser(tx, recipient, recipientHashes[index]!));
    }
    const userIds = [demo.id, second.id, ...recipients.map(({ id }) => id)];

    // Idempotency: wipe every seeded user's data and recreate it so re-running converges
    // to the same state. Transfers first: they reference the cards; the other side of a
    // transfer with a user the seed does not own keeps its movement (its transferId
    // becomes null).
    await tx.transfer.deleteMany({
      where: {
        OR: [{ senderId: { in: userIds } }, { recipientId: { in: userIds } }],
      },
    });
    await tx.movement.deleteMany({ where: { userId: { in: userIds } } });
    await tx.card.deleteMany({ where: { userId: { in: userIds } } });

    const demoCards = await createCards(
      tx,
      demo.id,
      DEMO_USER,
      DEMO_USER_CARDS,
    );
    const secondCards = await createCards(
      tx,
      second.id,
      SECOND_USER,
      SECOND_USER_CARDS,
    );
    const seededUsers = new Map<string, SeededUser>([
      [DEMO_USER.email, { id: demo.id, seed: DEMO_USER, cards: demoCards }],
      [
        SECOND_USER.email,
        { id: second.id, seed: SECOND_USER, cards: secondCards },
      ],
    ]);
    for (const [index, recipient] of PAST_RECIPIENTS.entries()) {
      const { id } = recipients[index]!;
      const cards = await createCards(
        tx,
        id,
        recipient,
        pastRecipientCards(index),
      );
      seededUsers.set(recipient.email, { id, seed: recipient, cards });
    }

    const demoMovements = await tx.movement.createMany({
      data: toMovementRows(demo.id, DEMO_USER_MOVEMENTS, demoCards, "GB-"),
    });
    const secondMovements = await tx.movement.createMany({
      data: toMovementRows(
        second.id,
        SECOND_USER_MOVEMENTS,
        secondCards,
        "GB-H",
      ),
    });

    const sender = seededUsers.get(DEMO_USER.email)!;
    for (const transfer of PAST_TRANSFERS) {
      await createPastTransfer(
        tx,
        transfer,
        sender,
        seededUsers.get(transfer.recipient.email)!,
      );
    }

    // Each past transfer adds a sent movement to the demo user; one went to the second.
    return {
      demo: demoMovements.count + PAST_TRANSFERS.length,
      second: secondMovements.count + 1,
    };
  });

  console.log(`Seeded ${DEMO_USER.email}: 2 cards, ${counts.demo} movements.`);
  console.log(
    `Seeded ${PAST_TRANSFERS.length} past transfers from ${DEMO_USER.alias}: ${PAST_TRANSFERS.map(({ recipient }) => recipient.alias).join(", ")}.`,
  );
  console.log(
    `Seeded ${SECOND_USER.email}: 2 cards, ${counts.second} movements.`,
  );
  console.log(
    `Seeded ${PAST_RECIPIENTS.length} past recipients: 2 cards and 1 movement each.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
