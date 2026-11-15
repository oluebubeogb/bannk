import { authMerchant, paystackApi, paystackFail, paystackOk, paystackPreflight } from "@/lib/devmode";
import { prisma } from "@/lib/prisma";
import { toPaystackTransaction } from "@/lib/payments/paystack";

export const OPTIONS = () => paystackPreflight();

export const GET = paystackApi<{ params: Promise<{ reference: string }> }>(async (req, ctx, log) => {
  const m = await authMerchant(req);
  log.merchant = m;
  const { reference } = await ctx.params;
  const ref = decodeURIComponent(reference);
  const t = await prisma.devTransaction.findUnique({ where: { apiKeyId_paymentReference: { apiKeyId: m.apiKeyId, paymentReference: ref } } });
  if (!t) return paystackFail("Transaction reference not found", 404);
  log.summary = `psk verify ${ref} ${t.status}`;
  return paystackOk("Verification successful", toPaystackTransaction(t));
});
