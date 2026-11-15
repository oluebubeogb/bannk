import { z } from "zod";
import { authMerchant, koboAmountSchema, paystackApi, paystackOk, paystackPreflight } from "@/lib/devmode";
import { getPaymentProvider } from "@/lib/payments";
import { paystackInitData, paystackReference } from "@/lib/payments/paystack";
import { prisma } from "@/lib/prisma";

export const OPTIONS = () => paystackPreflight();

const schema = z.object({
  email: z.string().email(),
  amount: koboAmountSchema,
  currency: z.string().default("NGN"),
  reference: z.string().min(1).max(100).optional(),
  callback_url: z.string().url().optional(),
  metadata: z.any().optional(),
  channels: z.array(z.string()).optional(),
});

export const POST = paystackApi(async (req, _c, log) => {
  const m = await authMerchant(req);
  log.merchant = m;
  const d = schema.parse(await req.json());
  const reference = d.reference || paystackReference();
  const v = await getPaymentProvider().initTransaction(m, {
    amountMinor: d.amount,
    currency: d.currency.toUpperCase(),
    paymentReference: reference,
    description: d.metadata && typeof d.metadata === "object" && "description" in d.metadata ? String((d.metadata as any).description) : undefined,
    customerEmail: d.email,
    customerName: d.metadata && typeof d.metadata === "object" && "customerName" in d.metadata ? String((d.metadata as any).customerName) : undefined,
    redirectUrl: d.callback_url,
    apiFlavor: "paystack",
    metadata: d.metadata,
  });
  const t = await prisma.devTransaction.findUnique({ where: { transactionReference: v.transactionReference } });
  log.summary = `psk init ${reference} ${d.currency} ${d.amount}`;
  return paystackOk("Authorization URL created", paystackInitData({
    transactionReference: v.transactionReference,
    paymentReference: v.paymentReference,
    accessCode: t?.accessCode,
  }));
});
