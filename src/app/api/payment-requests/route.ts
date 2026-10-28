import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError, handleError, requireUser, requireVerifiedUser } from "@/lib/api";
import { newPaymentToken, serializePaymentRequest } from "@/lib/paymentRequests";

const schema = z.object({
  amountMinor: z.number().int().positive().max(100_000_000_000),
  note: z.string().trim().max(140).optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

/** POST /api/payment-requests — create a receive-payment invoice (QR + link). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedUser();
    if (!user.profile) throw new HttpError(400, "Complete your profile first");
    const data = schema.parse(await req.json());

    const open = await prisma.paymentRequest.count({ where: { payeeUserId: user.id, status: "open" } });
    if (open >= 50) throw new HttpError(429, "You have too many open requests — cancel some first");

    const pr = await prisma.paymentRequest.create({
      data: {
        token: newPaymentToken(),
        payeeUserId: user.id,
        amountMinor: data.amountMinor,
        currency: user.profile.homeCurrency || "NGN",
        note: data.note || null,
        expiresAt: new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000),
      },
    });
    return NextResponse.json({
      request: serializePaymentRequest(pr, { username: user.profile.username, displayName: user.profile.displayName }),
    });
  } catch (e) {
    return handleError(e);
  }
}

/** GET /api/payment-requests — my recent requests. */
export async function GET() {
  try {
    const user = await requireUser();
    const rows = await prisma.paymentRequest.findMany({
      where: { payeeUserId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const payee = { username: user.profile?.username || "", displayName: user.profile?.displayName || null };
    return NextResponse.json({ requests: rows.map((r) => serializePaymentRequest(r, payee)) });
  } catch (e) {
    return handleError(e);
  }
}
