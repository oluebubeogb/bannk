import { authMerchant, devApi, ok } from "@/lib/devmode";
import { HttpError } from "@/lib/api";
import { getPaymentProvider } from "@/lib/payments";

export const GET = devApi<{ params: Promise<{ ref: string }> }>(async (req, ctx, log) => {
  const m = await authMerchant(req);
  log.merchant = m;
  const ref = decodeURIComponent((await ctx.params).ref);
  const v = await getPaymentProvider().getByTransactionReference(m, ref);
  if (!v) throw new HttpError(404, "Transaction not found");
  log.summary = `verify ${ref} ${v.paymentStatus}`;
  return ok(v);
});
