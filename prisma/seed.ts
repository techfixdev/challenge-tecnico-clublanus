import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import {
  PrismaClient,
  type MovementType,
} from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DEMO_USER = {
  email: "soygranate@clublanus.com",
  password: "GRANATE1@",
  firstName: "Granate",
  lastName: "Lanús",
} as const;

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

function dateDaysAgo(daysAgo: number, hour: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);

  // One interactive transaction: the upsert, the wipe and the recreate either all apply or
  // none do, so a failure half-way never leaves the demo user without cards or movements.
  const movementCount = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: DEMO_USER.email },
      update: {
        passwordHash,
        firstName: DEMO_USER.firstName,
        lastName: DEMO_USER.lastName,
      },
      create: {
        email: DEMO_USER.email,
        passwordHash,
        firstName: DEMO_USER.firstName,
        lastName: DEMO_USER.lastName,
      },
    });

    // Idempotency: wipe this user's data and recreate it so re-running converges to the same state.
    await tx.movement.deleteMany({ where: { userId: user.id } });
    await tx.card.deleteMany({ where: { userId: user.id } });

    const primary = await tx.card.create({
      data: {
        userId: user.id,
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
        userId: user.id,
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

    const movements = MOVEMENTS.map((movement, index) => ({
      userId: user.id,
      cardId: movement.card === "secondary" ? secondary.id : primary.id,
      counterparty: movement.counterparty,
      description: DESCRIPTION[movement.type],
      type: movement.type,
      amount: movement.amount,
      currency: "USD",
      status: movement.pending ? ("PENDING" as const) : ("COMPLETED" as const),
      reference: `GB-${String(index + 1).padStart(6, "0")}`,
      occurredAt: dateDaysAgo(movement.daysAgo, movement.hour),
    }));

    const { count } = await tx.movement.createMany({ data: movements });
    return count;
  });

  console.log(
    `Seeded ${DEMO_USER.email}: 2 cards, ${movementCount} movements.`,
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
