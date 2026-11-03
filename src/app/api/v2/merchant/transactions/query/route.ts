import { authMerchant, devApi, ok } from "@/lib/devmode";
import { HttpError } from "@/lib/api";
import { getPaymentProvider } from "@/lib/payments";

/** Monnify-shaped query: GET /api/v2/merchant/transactions/query?paymentReference=... */
export const GET = devApi(async (req, _c, log) => {
  const m = await authMerchant(req);
  log.merchant = m;
  const pr = new URL(req.url).searchParams.get("paymentReference");
  if (!pr) throw new HttpError(400, "paymentReference is required");
  const v = await getPaymentProvider().getByPaymentReference(m, pr);
  if (!v) throw new HttpError(404, "Transaction not found");
  log.summary = `query ${v.paymentReference} ${v.paymentStatus}`;
  return ok(v);
});
