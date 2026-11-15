-- Paystack drop-in: unique secret hash for Bearer sk_test_ lookup,
-- access codes, API flavor (webhook shape), and last decline code.
-- Existing MK_TEST_ / SK_TEST_ keys keep working; new keys are pk_test_ / sk_test_.

CREATE UNIQUE INDEX "DevApiKey_secretHash_key" ON "DevApiKey"("secretHash");

ALTER TABLE "DevTransaction" ADD COLUMN "accessCode" TEXT;
ALTER TABLE "DevTransaction" ADD COLUMN "apiFlavor" TEXT NOT NULL DEFAULT 'monnify';
ALTER TABLE "DevTransaction" ADD COLUMN "lastFailureCode" TEXT;

CREATE UNIQUE INDEX "DevTransaction_accessCode_key" ON "DevTransaction"("accessCode");
