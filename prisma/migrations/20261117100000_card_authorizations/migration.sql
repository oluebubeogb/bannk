-- Reusable card authorizations (Paystack charge_authorization). Non-sensitive card facts only.
ALTER TABLE "DevTransaction" ADD COLUMN "authorizationCode" TEXT;
ALTER TABLE "DevTransaction" ADD COLUMN "cardExpMonth" INTEGER;
ALTER TABLE "DevTransaction" ADD COLUMN "cardExpYear" INTEGER;

CREATE TABLE "DevCardAuthorization" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "merchantUserId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "cardBrand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "expMonth" INTEGER NOT NULL,
    "expYear" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DevCardAuthorization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DevCardAuthorization_code_key" ON "DevCardAuthorization"("code");
CREATE INDEX "DevCardAuthorization_merchantUserId_customerEmail_idx" ON "DevCardAuthorization"("merchantUserId", "customerEmail");
ALTER TABLE "DevCardAuthorization" ADD CONSTRAINT "DevCardAuthorization_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "DevApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
