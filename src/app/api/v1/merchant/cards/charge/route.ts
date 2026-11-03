import { z } from "zod";
import { authMerchant, devApi, ok } from "@/lib/devmode";
import { getPaymentProvider } from "@/lib/payments";

// Card fields are used in memory only — never persisted or logged.
const schema = z.object({
  transactionReference: z.string().min(5),
  collectionChannel: z.string().optional(),
  card: z.object({ number: z.string(), expiryMonth: z.union([z.string(), z.number()]), expiryYear: z.union([z.string(), z.number()]), cvv: z.string(), pin: z.string().optional() }),
});

export const POST = devApi(async (req, _c, log) => {
  const m = await authMerchant(req);
  log.merchant = m;
  const d = schema.parse(await req.json());
  const v = await getPaymentProvider().chargeCard(m, d.transactionReference, d.card);
  log.summary = `card ${v.cardDetails?.cardType} ••${v.cardDetails?.last4} ${v.transactionReference} ${v.paymentStatus}`;
  return ok({ status: v.paymentStatus === "PAID" ? "SUCCESS" : v.paymentStatus, message: "Transaction Successful", transactionReference: v.transactionReference, paymentReference: v.paymentReference, authorizedAmount: v.totalPayable, receiptId: v.receiptId });
});
