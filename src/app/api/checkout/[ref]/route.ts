import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handleError } from "@/lib/api";
import { PinError } from "@/lib/pin";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { devApi, ok } from "@/lib/devmode";
import { getPaymentProvider } from "@/lib/payments";

type Ctx = { params: Promise<{ ref: string }> };

/** Hosted checkout: public summary of a transaction. */
export async function GET(_r: Request, ctx: Ctx) {
  try {
    const ref = decodeURIComponent((await ctx.params).ref);
    const t = await prisma.devTransaction.findUnique({ where: { transactionReference: ref }, include: { merchant: { include: { profile: true } } } });
    if (!t) throw new HttpError(404, "Transaction not found");
    return NextResponse.json({
      transactionReference: t.transactionReference, paymentReference: t.paymentReference, amountMinor: t.amountMinor, currency: t.currency,
      description: t.description, status: t.status, paymentMethod: t.paymentMethod, redirectUrl: t.redirectUrl,
      merchant: { username: t.merchant.profile?.username, displayName: t.merchant.profile?.displayName },
    });
  } catch (e) { return handleError(e); }
}

const schema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("CARD"), card: z.object({ number: z.string(), expiryMonth: z.string(), expiryYear: z.string(), cvv: z.string(), pin: z.string() }) }),
  z.object({ method: z.literal("BANNK_TRANSFER"), pin: z.string() }),
]);

/** Pay from the hosted page — card (anyone) or Bannk balance (signed-in payer + PIN). */
export const POST = devApi<Ctx>(async (req, ctx, log) => {
  const ref = decodeURIComponent((await ctx.params).ref);
  const d = schema.parse(await req.json());
  const p = getPaymentProvider();
  const t = await prisma.devTransaction.findUnique({ where: { transactionReference: ref } });
  if (!t) throw new HttpError(404, "Transaction not found");
  log.merchant = { apiKeyId: t.apiKeyId, userId: t.merchantUserId };
  let v;
  if (d.method === "CARD") v = await p.chargeCard(null, ref, d.card);
  else {
    const u = await getSessionUser();
    if (!u) throw new HttpError(401, "Sign in to pay with Bannk");
    v = await p.chargeBannk(null, ref, { userId: u.id, pin: d.pin });
  }
  log.summary = `checkout ${d.method} ${ref} ${v.paymentStatus}`;
  return ok(v);
});
void PinError;
