-- Allow amounts above 2^31 kobo (~NGN 21.47M)
ALTER TABLE "DevTransaction" ALTER COLUMN "amountMinor" SET DATA TYPE BIGINT;
ALTER TABLE "JournalEntry" ALTER COLUMN "amountMinor" SET DATA TYPE BIGINT;
ALTER TABLE "PaymentRequest" ALTER COLUMN "amountMinor" SET DATA TYPE BIGINT;
ALTER TABLE "Trade" ALTER COLUMN "totalMinor" SET DATA TYPE BIGINT;

-- Webhooks signed with the API secret key (Monnify semantics)
ALTER TABLE "DevApiKey" ADD COLUMN "signingSecretEnc" TEXT;
