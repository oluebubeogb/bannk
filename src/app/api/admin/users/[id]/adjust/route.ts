import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/admin";
import { HttpError } from "@/lib/api";
import { adminAdjustBalance, ensureWallet, getWalletBalance } from "@/lib/ledger";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  direction: z.enum(["credit", "debit"]),
  amountMinor: z.number().int().positive().max(1_000_000_000_00),
  reason: z.string().trim().min(3, "A reason is required").max(300),
  currency: z.string().trim().length(3).optional(),
  idempotencyKey: z.string().min(8).max(100),
});

export const POST = withAdmin<Ctx>(async (req, { params }, admin) => {
  const { id } = await params;
  const data = schema.parse(await req.json());
  const user = await prisma.user.findUnique({ where: { id }, include: { profile: true } });
  if (!user || user.email === "system@bannk.internal") throw new HttpError(404, "User not found");
  const currency = (data.currency || user.profile?.homeCurrency || "NGN").toUpperCase();

  try {
    const journal = await adminAdjustBalance({
      actorUserId: admin.id,
      targetUserId: id,
      currencyCode: currency,
      amountMinor: data.amountMinor,
      direction: data.direction,
      reason: data.reason,
      idempotencyKey: `admin-adjust:${admin.id}:${data.idempotencyKey}`,
    });
    const { wallet } = await ensureWallet(id, currency);
    return NextResponse.json({
      ok: true,
      reference: journal.reference,
      transactionId: journal.id,
      balanceMinor: await getWalletBalance(wallet.id),
    });
  } catch (err: any) {
    if (err instanceof Error && /Insufficient|reason|Amount/.test(err.message)) throw new HttpError(400, err.message);
    throw err;
  }
});
