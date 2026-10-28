import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { executeTransfer } from "@/lib/ledger";
import { PinError, verifyUserPin } from "@/lib/pin";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

const schema = z.object({
  recipientUsername: z.string().min(2),
  currency: z.string().default("NGN"),
  amountMinor: z.number().int().positive(),
  note: z.string().max(200).optional(),
  idempotencyKey: z.string().optional(),
  /** 4-digit transaction PIN — required for every transfer. */
  pin: z.string().optional(),
  /** Pay a payment request / invoice (from /pay/[token]). */
  paymentRequestToken: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);
    const key = data.idempotencyKey || `transfer:${user.id}:${uuidv4()}`;

    // PIN gate (server-enforced). No PIN yet → client opens the set-PIN modal.
    await verifyUserPin(user.id, data.pin);

    let paymentRequestId: string | undefined;
    let recipientUsername = data.recipientUsername;
    let amountMinor = data.amountMinor;
    let note = data.note;
    let currency = data.currency;
    if (data.paymentRequestToken) {
      const pr = await prisma.paymentRequest.findUnique({
        where: { token: data.paymentRequestToken },
        include: { payee: { include: { profile: true } } },
      });
      if (!pr || pr.status !== "open" || (pr.expiresAt && pr.expiresAt < new Date())) {
        return NextResponse.json({ error: "This payment request is no longer open" }, { status: 400 });
      }
      // Server values win over anything the client sent.
      paymentRequestId = pr.id;
      recipientUsername = pr.payee.profile?.username || recipientUsername;
      amountMinor = pr.amountMinor;
      currency = pr.currency;
      note = note || pr.note || undefined;
    }

    const result = await executeTransfer({
      senderUserId: user.id,
      recipientUsername,
      currencyCode: currency,
      amountMinor,
      note,
      idempotencyKey: key,
      paymentRequestId,
    });

    return NextResponse.json({
      ok: true,
      transactionId: result.id,
      reference: result.reference || result.id,
      status: result.status,
    });
  } catch (err: any) {
    if (err instanceof PinError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message || "Invalid input" }, { status: 400 });
    }
    const message = err.message || "Transfer failed";
    const known = ["Insufficient", "not found", "yourself", "Weekly allowance", "no longer open", "must be positive"];
    const status = known.some((k) => message.includes(k)) ? 400 : 500;
    if (status === 500) console.error("[transfers] failed:", message);
    return NextResponse.json({ error: status === 500 ? "Transfer failed" : message }, { status });
  }
}
