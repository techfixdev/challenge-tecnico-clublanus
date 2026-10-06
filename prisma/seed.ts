import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { buildCvu } from "../src/features/account/domain/account-identifiers";
import {
  PrismaClient,
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
} as const;

/** Second demo user, so transfers can go both ways. */
const SECOND_USER = {
  email: "hincha@clublanus.com",
  password: "GRANATE2@",
  firstName: "Hincha",
  lastName: "Granate",
  alias: "hincha.granate",
  cvu: buildCvu("0000003", "1000000000025"),
} as const;

type UserSeed = typeof DEMO_USER | typeof SECOND_USER;

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
const MOVEMENTS: MovementSeed[] = [
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
    amount: "15.49",
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
    amount: "2.99",
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
    amount: "48.75",
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
    amount: "15.49",
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

function dateDaysAgo(daysAgo: number, hour: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date;
}

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

function toMovementRows(
  userId: string,
  seeds: MovementSeed[],
  cards: { primary: string; secondary?: string },
  referencePrefix: string,
) {
  return seeds.map((movement, index) => ({
    userId,
    cardId:
      movement.card === "secondary" && cards.secondary
        ? cards.secondary
        : cards.primary,
    counterparty: movement.counterparty,
    description: DESCRIPTION[movement.type],
    type: movement.type,
    amount: movement.amount,
    currency: "USD",
    status: movement.pending ? ("PENDING" as const) : ("COMPLETED" as const),
    reference: `${referencePrefix}${String(index + 1).padStart(6, "0")}`,
    occurredAt: dateDaysAgo(movement.daysAgo, movement.hour),
  }));
}

async function main() {
  // Hashed before the transaction: bcrypt is slow on purpose and must not hold it open.
  const [demoHash, secondHash] = await Promise.all(
    [DEMO_USER, SECOND_USER].map((user) => bcrypt.hash(user.password, 10)),
  );

  // One interactive transaction: the upserts, the wipe and the recreate either all apply or
  // none do, so a failure half-way never leaves a demo user without cards or movements.
  const counts = await prisma.$transaction(async (tx) => {
    const demo = await upsertUser(tx, DEMO_USER, demoHash);
    const second = await upsertUser(tx, SECOND_USER, secondHash);
    const userIds = [demo.id, second.id];

    // Idempotency: wipe both users' data and recreate it so re-running converges to the
    // same state. Transfers first: they reference the cards; the other side of a transfer
    // with a third user keeps its movement (its transferId becomes null).
    await tx.transfer.deleteMany({
      where: {
        OR: [{ senderId: { in: userIds } }, { recipientId: { in: userIds } }],
      },
    });
    await tx.movement.deleteMany({ where: { userId: { in: userIds } } });
    await tx.card.deleteMany({ where: { userId: { in: userIds } } });

    const primary = await tx.card.create({
      data: {
        userId: demo.id,
        brand: "MASTERCARD",
        last4: "1234",
        holderName: "Soy Granate",
        expMonth: 2,
        expYear: 2030,
        balance: "978.85",
        currency: "USD",
        isPrimary: true,
      },
    });

    const secondary = await tx.card.create({
      data: {
        userId: demo.id,
        brand: "VISA",
        last4: "5678",
        holderName: "Soy Granate",
        expMonth: 11,
        expYear: 2028,
        balance: "312.40",
        currency: "USD",
        isPrimary: false,
      },
    });

    const secondPrimary = await tx.card.create({
      data: {
        userId: second.id,
        brand: "VISA",
        last4: "1910",
        holderName: "Hincha Granate",
        expMonth: 1,
        expYear: 2031,
        balance: "650.00",
        currency: "USD",
        isPrimary: true,
      },
    });

    const demoMovements = await tx.movement.createMany({
      data: toMovementRows(
        demo.id,
        MOVEMENTS,
        { primary: primary.id, secondary: secondary.id },
        "GB-",
      ),
    });
    const secondMovements = await tx.movement.createMany({
      data: toMovementRows(
        second.id,
        SECOND_USER_MOVEMENTS,
        { primary: secondPrimary.id },
        "GB-H",
      ),
    });
    return { demo: demoMovements.count, second: secondMovements.count };
  });

  console.log(`Seeded ${DEMO_USER.email}: 2 cards, ${counts.demo} movements.`);
  console.log(
    `Seeded ${SECOND_USER.email}: 1 card, ${counts.second} movements.`,
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
