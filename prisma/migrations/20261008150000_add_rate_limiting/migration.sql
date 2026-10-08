-- Rate limiting stored in PostgreSQL (no Redis: one less service, and it works the same
-- on Vercel serverless + Neon, where in-memory counters reset per instance) and an audit
-- log of card-detail reveals. See src/shared/lib/rate-limit.ts for the policy.
CREATE TABLE "RateLimitBucket" (
    "scope" VARCHAR(32) NOT NULL,
    "key" VARCHAR(320) NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("scope","key","windowStart")
);

-- CreateTable
CREATE TABLE "CardDetailsReveal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "ip" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardDetailsReveal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart");

-- CreateIndex
CREATE INDEX "CardDetailsReveal_userId_createdAt_idx" ON "CardDetailsReveal"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CardDetailsReveal_cardId_idx" ON "CardDetailsReveal"("cardId");

-- AddForeignKey
ALTER TABLE "CardDetailsReveal" ADD CONSTRAINT "CardDetailsReveal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardDetailsReveal" ADD CONSTRAINT "CardDetailsReveal_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A refunded hit (a successful login gives its slot back) never takes a count below zero.

ALTER TABLE "RateLimitBucket" ADD CONSTRAINT "RateLimitBucket_count_check" CHECK ("count" >= 0);
