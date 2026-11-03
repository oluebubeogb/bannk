import { z } from "zod";
import { amountSchema, authMerchant, devApi, ok } from "@/lib/devmode";
import { getPaymentProvider } from "@/lib/payments";

const schema = z.object({
  amount: amountSchema,
  customerName: z.string().max(120).optional(),
  customerEmail: z.string().email().optional(),
  paymentReference: z.string().min(1).max(100),
  paymentDescription: z.string().max(200).optional(),
  currencyCode: z.string().default("NGN"),
  contractCode: z.string().optional(),
  redirectUrl: z.string().url().optional(),
  paymentMethods: z.array(z.string()).optional(),
});

export const POST = devApi(async (req, _c, log) => {
  const m = await authMerchant(req);
  log.merchant = m;
  const d = schema.parse(await req.json());
  const v = await getPaymentProvider().initTransaction(m, {
    amountMinor: d.amount, currency: d.currencyCode, paymentReference: d.paymentReference,
    description: d.paymentDescription, customerName: d.customerName, customerEmail: d.customerEmail, redirectUrl: d.redirectUrl,
  });
  log.summary = `init ${v.transactionReference} ${d.currencyCode} ${v.totalPayable}`;
  return ok({ transactionReference: v.transactionReference, paymentReference: v.paymentReference, totalPayable: v.totalPayable, enabledPaymentMethod: ["CARD", "BANNK_TRANSFER"], checkoutUrl: v.checkoutUrl });
});
