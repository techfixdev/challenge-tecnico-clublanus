-- AlterTable
ALTER TABLE "Movement" ADD COLUMN     "transferId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "alias" VARCHAR(20),
ADD COLUMN     "cvu" CHAR(22);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "sourceCardId" TEXT,
    "destinationCardId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "description" VARCHAR(60),
    "idempotencyKey" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transfer_recipientId_createdAt_idx" ON "Transfer"("recipientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Transfer_senderId_createdAt_idx" ON "Transfer"("senderId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_senderId_idempotencyKey_key" ON "Transfer"("senderId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Movement_transferId_type_key" ON "Movement"("transferId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "User_alias_key" ON "User"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "User_cvu_key" ON "User"("cvu");

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_sourceCardId_fkey" FOREIGN KEY ("sourceCardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_destinationCardId_fkey" FOREIGN KEY ("destinationCardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-written: invariants Prisma cannot express in the schema. The application already
-- enforces them; the database is the last line of defense if a bug or a manual query slips.

-- A card balance never goes negative (the transfer debit is a conditional update; this
-- makes an overdraft impossible even for code that forgets the condition).
ALTER TABLE "Card" ADD CONSTRAINT "Card_balance_non_negative" CHECK ("balance" >= 0);

-- A transfer moves a positive amount between two different users.
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_distinct_parties" CHECK ("senderId" <> "recipientId");

-- Alias: 6-20 lowercase letters, digits, dots or hyphens. CVU: exactly 22 digits.
ALTER TABLE "User" ADD CONSTRAINT "User_alias_format" CHECK ("alias" ~ '^[a-z0-9.-]{6,20}$');
ALTER TABLE "User" ADD CONSTRAINT "User_cvu_format" CHECK ("cvu" ~ '^[0-9]{22}$');
