-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pinFailedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinLockedUntil" TIMESTAMP(3),
ADD COLUMN     "pinSetAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PasswordResetChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "requestIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "payeeUserId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "expiresAt" TIMESTAMP(3),
    "paidByUserId" TEXT,
    "transactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordResetChallenge_userId_createdAt_idx" ON "PasswordResetChallenge"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_token_key" ON "PaymentRequest"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_transactionId_key" ON "PaymentRequest"("transactionId");

-- CreateIndex
CREATE INDEX "PaymentRequest_payeeUserId_createdAt_idx" ON "PaymentRequest"("payeeUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "PasswordResetChallenge" ADD CONSTRAINT "PasswordResetChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_payeeUserId_fkey" FOREIGN KEY ("payeeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

