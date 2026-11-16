import { z } from "zod";
import { authMerchant, koboAmountSchema, paystackApi, paystackFail, paystackOk, paystackPreflight } from "@/lib/devmode";
import { HttpError } from "@/lib/api";
import { chargeAuthorization } from "@/lib/payments/dev";
import { paystackReference, toPaystackTransaction } from "@/lib/payments/paystack";

export const OPTIONS = () => paystackPreflight();

const schema = z.object({
  email: z.string().email(),
  amount: koboAmountSchema,
  authorization_code: z.string().regex(/^AUTH_[A-Za-z0-9_-]{4,80}$/, "Invalid Authorization code"),
  currency: z.string().default("NGN"),
  reference: z.string().min(1).max(100).optional(),
  metadata: z.any().optional(),
  // Bannk sandbox extension (not sent by real Paystack clients): simulate a decline on a saved card.
  sandbox_pin: z.string().regex(/^\d{4}$/).optional(),
});

/** Paystack-compatible POST /transaction/charge_authorization (Bearer sk_test_…). */
export const POST = paystackApi(async (req, _c, log) => {
  const m = await authMerchant(req);
  log.merchant = m;
  const d = schema.parse(await req.json());
  const reference = d.reference || paystackReference();
  try {
    const { tx, declined } = await chargeAuthorization(m, {
      email: d.email, amountMinor: d.amount, currency: d.currency.toUpperCase(), authorizationCode: d.authorization_code, reference, metadata: d.metadata, sandboxPin: d.sandbox_pin,
    });
    log.summary = `psk charge_authorization ${reference} ${declined ? declined.code : tx.status}`;
    if (declined) return paystackOk("Charge attempted", { ...toPaystackTransaction(tx), status: "failed", gateway_response: declined.message });
    return paystackOk("Charge attempted", { ...toPaystackTransaction(tx), status: "success", gateway_response: "Approved" });
  } catch (e) {
    if (e instanceof HttpError) return paystackFail(e.message, e.status);
    throw e;
  }
});
