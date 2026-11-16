import { z } from "zod";
import { authMerchant, paystackApi, paystackFail, paystackOk, paystackPreflight } from "@/lib/devmode";
import { HttpError } from "@/lib/api";
import { deactivateAuthorization } from "@/lib/payments/dev";

export const OPTIONS = () => paystackPreflight();

const schema = z.object({ authorization_code: z.string().min(5).max(100) });

/** Paystack-compatible POST /customer/deactivate_authorization. Later charges with the code are declined. */
export const POST = paystackApi(async (req, _c, log) => {
  const m = await authMerchant(req);
  log.merchant = m;
  const d = schema.parse(await req.json());
  try {
    await deactivateAuthorization(m, d.authorization_code);
  } catch (e) {
    if (e instanceof HttpError) return paystackFail(e.message, e.status);
    throw e;
  }
  log.summary = "psk deactivate_authorization";
  return paystackOk("Authorization has been deactivated", null);
});
