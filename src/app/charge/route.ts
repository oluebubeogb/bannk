import { z } from "zod";
import { authMerchant, koboAmountSchema, paystackApi, paystackFail, paystackOk, paystackPreflight } from "@/lib/devmode";
import { HttpError } from "@/lib/api";
import { getPaymentProvider } from "@/lib/payments";
import { CARD_MESSAGES, CardError, validateCard, type CardInput } from "@/lib/payments/card";
import { paystackReference, stashPendingCard, toPaystackTransaction } from "@/lib/payments/paystack";
import { prisma } from "@/lib/prisma";

export const OPTIONS = () => paystackPreflight();

const cardSchema = z.object({
  number: z.string(),
  cvv: z.string(),
  expiry_month: z.union([z.string(), z.number()]),
  expiry_year: z.union([z.string(), z.number()]),
});

const schema = z.object({
  metadata: z.any().optional(),
  email: z.string().email(),
  amount: koboAmountSchema,
  currency: z.string().default("NGN"),
  reference: z.string().min(1).max(100).optional(),
  pin: z.string().optional(),
  card: cardSchema,
});

function toCardInput(card: z.infer<typeof cardSchema>, pin?: string): CardInput {
  return { number: card.number, expiryMonth: card.expiry_month, expiryYear: card.expiry_year, cvv: card.cvv, pin };
}

function declined(err: HttpError | CardError, reference: string) {
  const code = err instanceof CardError ? err.code : err.code;
  const message =
    (code && code in CARD_MESSAGES.paystack ? CARD_MESSAGES.paystack[code as keyof typeof CARD_MESSAGES.paystack] : null) ||
    err.message;
  return paystackFail("Charge attempted", 200, {
    status: "failed",
    gateway_response: message,
    reference,
  });
}

export const POST = paystackApi(async (req, _c, log) => {
  const m = await authMerchant(req);
  log.merchant = m;
  const d = schema.parse(await req.json());
  const reference = d.reference || paystackReference();
  const p = getPaymentProvider();
  const existing = await prisma.devTransaction.findUnique({ where: { apiKeyId_paymentReference: { apiKeyId: m.apiKeyId, paymentReference: reference } } });
  const v = existing
    ? { transactionReference: existing.transactionReference, paymentReference: existing.paymentReference }
    : await p.initTransaction(m, {
        amountMinor: d.amount,
        currency: d.currency.toUpperCase(),
        paymentReference: reference,
        customerEmail: d.email,
        redirectUrl: undefined,
        apiFlavor: "paystack",
        metadata: d.metadata,
      });

  if (!d.pin) {
    try {
      validateCard(toCardInput(d.card, "0000"), { pinRequired: false }); // dummy pin ignored when pinRequired is false
    } catch (e: any) {
      const msg = e?.message === "Card has expired" ? CARD_MESSAGES.paystack.EXPIRED_CARD : (e?.message || "Invalid card details");
      const code = e?.message === "Card has expired" ? "EXPIRED_CARD" : "INVALID_CARD";
      if (existing || v) {
        const t = await prisma.devTransaction.findUnique({ where: { transactionReference: v.transactionReference } });
        if (t && t.status !== "PAID") await prisma.devTransaction.update({ where: { id: t.id }, data: { lastFailureCode: code } }).catch(() => {});
      }
      return declined(new CardError(code as any, msg), reference);
    }
    stashPendingCard(reference, { card: toCardInput(d.card), merchant: m, transactionReference: v.transactionReference });
    log.summary = `psk charge send_pin ${reference}`;
    return paystackOk("Charge attempted", {
      status: "send_pin",
      reference,
      display_text: "Please enter your card PIN",
    });
  }

  try {
    await p.chargeCard(m, v.transactionReference, toCardInput(d.card, d.pin), { messageFlavor: "paystack" });
  } catch (e: any) {
    if (e instanceof HttpError || e instanceof CardError) return declined(e, reference);
    throw e;
  }
  const t = await prisma.devTransaction.findUnique({ where: { transactionReference: v.transactionReference } });
  log.summary = `psk charge ${reference} ${t?.status}`;
  return paystackOk("Charge attempted", { ...toPaystackTransaction(t!), status: t?.status === "PAID" ? "success" : "failed", gateway_response: t?.status === "PAID" ? "Successful" : "The transaction was not completed" });
});
