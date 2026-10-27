import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { executeTransfer } from "@/lib/ledger";
import { v4 as uuidv4 } from "uuid";

const schema = z.object({
  recipientUsername: z.string().min(2),
  currency: z.string().default("NGN"),
  amountMinor: z.number().int().positive(),
  note: z.string().max(200).optional(),
  idempotencyKey: z.string().optional(),
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

    const result = await executeTransfer({
      senderUserId: user.id,
      recipientUsername: data.recipientUsername,
      currencyCode: data.currency,
      amountMinor: data.amountMinor,
      note: data.note,
      idempotencyKey: key,
    });

    return NextResponse.json({
      ok: true,
      transactionId: result.id,
      reference: result.reference || result.id,
      status: result.status,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    const message = err.message || "Transfer failed";
    const status =
      message.includes("Insufficient") || message.includes("not found") || message.includes("yourself")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
