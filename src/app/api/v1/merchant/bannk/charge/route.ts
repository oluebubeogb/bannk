import { z } from "zod";
import { authMerchant, devApi, ok } from "@/lib/devmode";
import { getPaymentProvider } from "@/lib/payments";

/** In-app Bannk transfer: payer's username + their Bannk transaction PIN (verified, never stored). */
const schema = z.object({ transactionReference: z.string().min(5), payerUsername: z.string().min(2), pin: z.string() });

export const POST = devApi(async (req, _c, log) => {
  const m = await authMerchant(req);
  log.merchant = m;
  const d = schema.parse(await req.json());
  const v = await getPaymentProvider().chargeBannk(m, d.transactionReference, { username: d.payerUsername, pin: d.pin });
  log.summary = `bannk @${v.payerUsername} ${v.transactionReference} ${v.paymentStatus}`;
  return ok({ status: "SUCCESS", message: "Transaction Successful", transactionReference: v.transactionReference, paymentReference: v.paymentReference, authorizedAmount: v.totalPayable, payerUsername: v.payerUsername, receiptId: v.receiptId });
});
