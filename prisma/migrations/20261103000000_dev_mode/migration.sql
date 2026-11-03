ALTER TABLE "User" ADD COLUMN "devModeEnabledAt" TIMESTAMP(3);

CREATE TABLE "DevApiKey" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "label" TEXT NOT NULL DEFAULT 'Default',
  "apiKey" TEXT NOT NULL, "secretHash" TEXT NOT NULL, "secretHint" TEXT NOT NULL,
  "contractCode" TEXT NOT NULL, "webhookUrl" TEXT, "webhookSecret" TEXT NOT NULL,
  "createdById" TEXT, "revokedAt" TIMESTAMP(3), "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DevApiKey_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "DevApiKey_apiKey_key" ON "DevApiKey"("apiKey");
CREATE UNIQUE INDEX "DevApiKey_contractCode_key" ON "DevApiKey"("contractCode");
CREATE INDEX "DevApiKey_userId_idx" ON "DevApiKey"("userId");
ALTER TABLE "DevApiKey" ADD CONSTRAINT "DevApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DevTransaction" (
  "id" TEXT NOT NULL, "merchantUserId" TEXT NOT NULL, "apiKeyId" TEXT NOT NULL,
  "transactionReference" TEXT NOT NULL, "paymentReference" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'NGN',
  "description" TEXT, "customerName" TEXT, "customerEmail" TEXT, "redirectUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING', "paymentMethod" TEXT, "cardBrand" TEXT, "cardLast4" TEXT,
  "payerUsername" TEXT, "journalId" TEXT, "webhookStatus" TEXT, "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DevTransaction_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "DevTransaction_transactionReference_key" ON "DevTransaction"("transactionReference");
CREATE UNIQUE INDEX "DevTransaction_apiKeyId_paymentReference_key" ON "DevTransaction"("apiKeyId", "paymentReference");
CREATE INDEX "DevTransaction_merchantUserId_createdAt_idx" ON "DevTransaction"("merchantUserId", "createdAt");
ALTER TABLE "DevTransaction" ADD CONSTRAINT "DevTransaction_merchantUserId_fkey" FOREIGN KEY ("merchantUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevTransaction" ADD CONSTRAINT "DevTransaction_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "DevApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DevApiLog" (
  "id" TEXT NOT NULL, "userId" TEXT, "apiKeyId" TEXT, "method" TEXT NOT NULL, "path" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL, "ip" TEXT, "summary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DevApiLog_pkey" PRIMARY KEY ("id"));
CREATE INDEX "DevApiLog_userId_createdAt_idx" ON "DevApiLog"("userId", "createdAt");
ALTER TABLE "DevApiLog" ADD CONSTRAINT "DevApiLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "DevApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
