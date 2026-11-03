import { authMerchant, devApi, ok } from "@/lib/devmode";
import { HttpError } from "@/lib/api";
import { getPaymentProvider } from "@/lib/payments";

/** Monnify-shaped status: GET /api/v2/transactions/{transactionReference} */
export const GET = devApi<{ params: Promise<{ ref: string }> }>(async (req, ctx, log) => {
  const m = await authMerchant(req);
  log.merchant = m;
  const { ref } = await ctx.params;
  const v = await getPaymentProvider().getByTransactionReference(m, decodeURIComponent(ref));
  if (!v) throw new HttpError(404, "Transaction not found");
  log.summary = `status ${v.transactionReference} ${v.paymentStatus}`;
  return ok(v);
});
