import { authMerchant, devApi, ok } from "@/lib/devmode";
import { HttpError } from "@/lib/api";
import { getPaymentProvider } from "@/lib/payments";

export const GET = devApi(async (req, _c, log) => {
  const m = await authMerchant(req);
  log.merchant = m;
  const u = new URL(req.url);
  const pr = u.searchParams.get("paymentReference");
  const tr = u.searchParams.get("transactionReference");
  const p = getPaymentProvider();
  const v = pr ? await p.getByPaymentReference(m, pr) : tr ? await p.getByTransactionReference(m, tr) : null;
  if (!v) throw new HttpError(404, "Transaction not found");
  log.summary = `query ${v.transactionReference} ${v.paymentStatus}`;
  return ok(v);
});
