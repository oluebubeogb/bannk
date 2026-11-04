import { PrismaClient } from "@prisma/client";

/**
 * Large money columns are BIGINT in Postgres (amounts > NGN 21.47M overflow INT).
 * Reads are mapped back to JS number (exact up to 2^53 kobo ≈ NGN 90 trillion),
 * so app code and JSON responses keep working with plain numbers.
 */
const toNum = (v: bigint | number) => Number(v);

function makeClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  }).$extends({
    result: {
      devTransaction: { amountMinor: { needs: { amountMinor: true }, compute: (r) => toNum(r.amountMinor) } },
      journalEntry: { amountMinor: { needs: { amountMinor: true }, compute: (r) => toNum(r.amountMinor) } },
      paymentRequest: { amountMinor: { needs: { amountMinor: true }, compute: (r) => toNum(r.amountMinor) } },
      trade: { totalMinor: { needs: { totalMinor: true }, compute: (r) => toNum(r.totalMinor) } },
    },
  });
}

type Client = ReturnType<typeof makeClient>;
const globalForPrisma = globalThis as unknown as { prisma?: Client };

export const prisma: Client = globalForPrisma.prisma || makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
