import { NextResponse } from "next/server";
import { z } from "zod";
import { amountSchema } from "@/lib/devmode";
import { HttpError, handleError, requireVerifiedUser } from "@/lib/api";
import { CardError, evaluateSandboxCard } from "@/lib/payments/card";
import { ensureWallet, fundWalletFromCard, getWalletBalance } from "@/lib/ledger";
import { randomBytes } from "crypto";

/** Sandbox cap per funding request in major units of the wallet's currency, set by BANNK_FUND_MAX (default 10,000,000). */
const FUND_MAX_MAJOR = (() => {
  const v = Number(process.env.BANNK_FUND_MAX);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 10_000_000;
})();

const schema = z.object({
  amount: amountSchema,
  currency: z.string().trim().length(3).optional(),
  card: z.object({
    number: z.string(),
    expiryMonth: z.union([z.string(), z.number()]),
    expiryYear: z.union([z.string(), z.number()]),
    cvv: z.string(),
    pin: z.string(),
  }),
  idempotencyKey: z.string().min(8).max(100).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireVerifiedUser();
    const d = schema.parse(await req.json());
    const home = (user.profile?.homeCurrency || "NGN").toUpperCase();
    if (d.currency && d.currency.toUpperCase() !== home) {
      throw new HttpError(400, `Funding is only available in your home currency (${home})`);
    }
    if (d.amount > FUND_MAX_MAJOR * 100) {
      throw new HttpError(400, `Amount exceeds the ${home} ${FUND_MAX_MAJOR.toLocaleString("en-US")} sandbox cap`);
    }
    let meta;
    try {
      meta = evaluateSandboxCard(d.card, "bannk");
    } catch (e: any) {
      const code = e instanceof CardError ? e.code : "INVALID_CARD";
      throw e instanceof HttpError ? e : new HttpError(400, e.message, code);
    }
    const journal = await fundWalletFromCard({
      userId: user.id,
      currencyCode: home,
      amountMinor: d.amount,
      brand: meta.brand,
      last4: meta.last4,
      idempotencyKey: d.idempotencyKey ? `cardfund:${user.id}:${d.idempotencyKey}` : `cardfund:${user.id}:${randomBytes(12).toString("hex")}`,
    });
    const { wallet } = await ensureWallet(user.id, home);
    return NextResponse.json({
      ok: true,
      balanceMinor: await getWalletBalance(wallet.id),
      transactionId: journal.id,
      reference: journal.reference,
    });
  } catch (e) {
    return handleError(e);
  }
}
