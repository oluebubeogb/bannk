import { z } from "zod";
import { koboAmountSchema, paystackFail, paystackOk, paystackPreflight, withCors } from "@/lib/devmode";
import { HttpError, handleError } from "@/lib/api";
import { getPaymentProvider } from "@/lib/payments";
import { merchantFromPublicKey, paystackInitData, paystackReference } from "@/lib/payments/paystack";
import { prisma } from "@/lib/prisma";

export const OPTIONS = () => paystackPreflight();

const schema = z.object({
  key: z.string().min(8),
  email: z.string().email(),
  amount: koboAmountSchema,
  currency: z.string().default("NGN"),
  ref: z.string().min(1).max(100).optional(),
  reference: z.string().min(1).max(100).optional(),
  callback_url: z.string().url().optional(),
});

export async function POST(req: Request) {
  try {
    const d = schema.parse(await req.json());
    const m = await merchantFromPublicKey(d.key);
    const reference = d.reference || d.ref || paystackReference();
    const v = await getPaymentProvider().initTransaction(m, {
      amountMinor: d.amount,
      currency: d.currency.toUpperCase(),
      paymentReference: reference,
      customerEmail: d.email,
      redirectUrl: d.callback_url,
      apiFlavor: "paystack",
    });
    const t = await prisma.devTransaction.findUnique({ where: { transactionReference: v.transactionReference } });
    return withCors(paystackOk("Authorization URL created", paystackInitData({
      transactionReference: v.transactionReference,
      paymentReference: v.paymentReference,
      accessCode: t?.accessCode,
    })));
  } catch (e: any) {
    if (e instanceof HttpError) return withCors(paystackFail(e.message, e.status));
    if (e instanceof z.ZodError) return withCors(paystackFail(`${e.errors[0]?.path.join(".")}: ${e.errors[0]?.message}`));
    return withCors(handleError(e));
  }
}
