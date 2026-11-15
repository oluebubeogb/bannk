import { z } from "zod";
import { authMerchant, paystackApi, paystackFail, paystackOk, paystackPreflight } from "@/lib/devmode";
import { HttpError } from "@/lib/api";
import { CARD_MESSAGES, CardError } from "@/lib/payments/card";
import { getPaymentProvider } from "@/lib/payments";
import { takePendingCard, toPaystackTransaction } from "@/lib/payments/paystack";
import { prisma } from "@/lib/prisma";

export const OPTIONS = () => paystackPreflight();

const schema = z.object({
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
  reference: z.string().min(1),
});

export const POST = paystackApi(async (req, _c, log) => {
  const m = await authMerchant(req);
  log.merchant = m;
  const d = schema.parse(await req.json());
  const pending = takePendingCard(d.reference);
  if (!pending || pending.merchant.apiKeyId !== m.apiKeyId) {
    return paystackFail("Expired session or invalid reference. Send the card again.", 400);
  }
  try {
    await getPaymentProvider().chargeCard(m, pending.transactionReference, { ...pending.card, pin: d.pin }, { messageFlavor: "paystack" });
  } catch (e: any) {
    if (e instanceof HttpError || e instanceof CardError) {
      const code = e instanceof CardError ? e.code : e.code;
      const message =
        (code && code in CARD_MESSAGES.paystack ? CARD_MESSAGES.paystack[code as keyof typeof CARD_MESSAGES.paystack] : null) ||
        e.message;
      return paystackFail("Charge attempted", 200, { status: "failed", gateway_response: message, reference: d.reference });
    }
    throw e;
  }
  const t = await prisma.devTransaction.findUnique({ where: { transactionReference: pending.transactionReference } });
  log.summary = `psk submit_pin ${d.reference} ${t?.status}`;
  return paystackOk("Charge attempted", { ...toPaystackTransaction(t!), status: t?.status === "PAID" ? "success" : "failed", gateway_response: t?.status === "PAID" ? "Successful" : "The transaction was not completed" });
});
